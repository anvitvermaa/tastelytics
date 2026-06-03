import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import aws_cdk as cdk
from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_codecommit as codecommit,
    aws_codepipeline as codepipeline,
    aws_codepipeline_actions as cpactions,
    aws_codebuild as codebuild,
    RemovalPolicy,
    Duration,
    CfnOutput
)
from constructs import Construct

class TastelyticsStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        user_pool = cognito.UserPool(
            self, "TastelyticsUserPool",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True, username=False),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            custom_attributes={
                "age": cognito.NumberAttribute(mutable=True),
                "favorite_genres": cognito.StringAttribute(mutable=True)
            },
            removal_policy=RemovalPolicy.DESTROY
        )

        google_provider = cognito.UserPoolIdentityProviderGoogle(
            self, "GoogleProvider",
            user_pool=user_pool,
            client_id=os.environ.get("GOOGLE_OAUTH_CLIENT_ID", ""),
            client_secret=os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", ""),
            scopes=["profile", "email", "openid"],
            attribute_mapping=cognito.AttributeMapping(
                email=cognito.ProviderAttribute.GOOGLE_EMAIL,
                fullname=cognito.ProviderAttribute.GOOGLE_NAME
            )
        )

        user_pool_domain = user_pool.add_domain(
            "TastelyticsDomain",
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix="tastelytics-auth-app"
            )
        )

        frontend_bucket = s3.Bucket(
            self, "FrontendBucket",
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        oai = cloudfront.OriginAccessIdentity(self, "FrontendOAI")
        frontend_bucket.grant_read(oai)

        distribution = cloudfront.Distribution(
            self, "FrontendDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(frontend_bucket, origin_access_identity=oai),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            ),
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_page_path="/index.html",
                    response_http_status=200
                ),
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_page_path="/index.html",
                    response_http_status=200
                )
            ]
        )

        cf_url = f"https://{distribution.distribution_domain_name}"


        user_pool_client = user_pool.add_client(
            "TastelyticsAppClient",
            auth_flows=cognito.AuthFlow(user_password=True, user_srp=True),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.GOOGLE,
                cognito.UserPoolClientIdentityProvider.COGNITO
            ],
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,
                    implicit_code_grant=True
                ),
                scopes=[cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
                callback_urls=["http://localhost:5173", "http://localhost:5173/callback", cf_url, f"{cf_url}/callback"],
                logout_urls=["http://localhost:5173", "http://localhost:5173/logout", cf_url, f"{cf_url}/logout"]
            )
        )
        user_pool_client.node.add_dependency(google_provider)

        table = dynamodb.Table(
            self, "TastelyticsTable",
            partition_key=dynamodb.Attribute(name="TrackID", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="UserID_Timestamp", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        table.add_global_secondary_index(
            index_name="UserReviewsIndex",
            partition_key=dynamodb.Attribute(name="UserID", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="Timestamp", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL
        )

        playlists_table = dynamodb.Table(
            self, "TastelyticsPlaylistsTable",
            partition_key=dynamodb.Attribute(name="UserID", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="PlaylistID", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        api_lambda = _lambda.DockerImageFunction(
            self, "TastelyticsApiHandler",
            code=_lambda.DockerImageCode.from_image_asset("../backend"),
            memory_size=1024,
            timeout=Duration.seconds(60),
            environment={
                "DYNAMODB_TABLE": table.table_name,
                "PLAYLISTS_TABLE": playlists_table.table_name,
                "SPOTIFY_CLIENT_ID": os.environ.get("SPOTIFY_CLIENT_ID", ""),
                "SPOTIFY_CLIENT_SECRET": os.environ.get("SPOTIFY_CLIENT_SECRET", "")
            }
        )
        table.grant_read_write_data(api_lambda)
        playlists_table.grant_read_write_data(api_lambda)

        api = apigw.RestApi(
            self, "TastelyticsApi",
            rest_api_name="Tastelytics Service",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS
            )
        )

        reviews_resource = api.root.add_resource("reviews")
        lambda_integration = apigw.LambdaIntegration(api_lambda)
        
        reviews_resource.add_method("POST", lambda_integration)
        
        track_resource = reviews_resource.add_resource("track").add_resource("{track_id}")
        track_resource.add_method("GET", lambda_integration)

        item_resource = reviews_resource.add_resource("item").add_resource("{item_id}")
        item_resource.add_method("GET", lambda_integration)

        user_resource = reviews_resource.add_resource("user").add_resource("{user_id}")
        user_resource.add_method("GET", lambda_integration)

        search_resource = api.root.add_resource("search")
        search_resource.add_method("GET", lambda_integration)

        # Personalized recommendations
        recs_resource = api.root.add_resource("recommendations")
        recs_resource.add_method("GET", lambda_integration)

        onboarding_resource = api.root.add_resource("onboarding")
        onboarding_recs = onboarding_resource.add_resource("recommendations")
        onboarding_recs.add_method("GET", lambda_integration)

        # Artist detail routes
        artist_resource = api.root.add_resource("artist")
        artist_id_resource = artist_resource.add_resource("{artistId}")
        artist_id_resource.add_method("GET", lambda_integration)
        artist_top_tracks = artist_id_resource.add_resource("top-tracks")
        artist_top_tracks.add_method("GET", lambda_integration)
        artist_albums = artist_id_resource.add_resource("albums")
        artist_albums.add_method("GET", lambda_integration)
        artist_related = artist_id_resource.add_resource("related")
        artist_related.add_method("GET", lambda_integration)

        # Album details
        album_resource = api.root.add_resource("album")
        album_id_resource = album_resource.add_resource("{albumId}")
        album_id_resource.add_method("GET", lambda_integration)

        # New releases
        new_releases_resource = api.root.add_resource("new-releases")
        new_releases_resource.add_method("GET", lambda_integration)

        # Playlists (no auth — user_id passed in body/query)
        playlists_resource = api.root.add_resource("playlists")
        playlists_resource.add_method("GET", lambda_integration)
        playlists_resource.add_method("POST", lambda_integration)
        playlists_resource.add_method("PUT", lambda_integration)
        playlists_resource.add_method("DELETE", lambda_integration)

        # Home feed
        feed_resource = api.root.add_resource("feed")
        feed_resource.add_method("GET", lambda_integration)

        profile_resource = api.root.add_resource("profile")
        profile_resource.add_method("GET", lambda_integration)
        profile_resource.add_method("POST", lambda_integration)

        # Auth Routes
        auth_resource = api.root.add_resource("auth")
        auth_spotify = auth_resource.add_resource("spotify")
        auth_spotify.add_method("POST", lambda_integration)
        
        # Spotify Routes
        spotify_resource = api.root.add_resource("spotify")
        spotify_analysis = spotify_resource.add_resource("analysis")
        spotify_analysis.add_method("GET", lambda_integration)

        repo = codecommit.Repository(
            self, "TastelyticsRepo",
            repository_name="TastelyticsBackend"
        )
        
        pipeline = codepipeline.Pipeline(
            self, "TastelyticsPipeline",
            pipeline_name="TastelyticsBackendPipeline"
        )
        
        source_output = codepipeline.Artifact()
        source_action = cpactions.CodeCommitSourceAction(
            action_name="CodeCommit",
            repository=repo,
            branch="main",
            output=source_output
        )
        pipeline.add_stage(stage_name="Source", actions=[source_action])

        build_project = codebuild.PipelineProject(self, "TastelyticsBuild")
        build_output = codepipeline.Artifact()
        build_action = cpactions.CodeBuildAction(
            action_name="Build",
            project=build_project,
            input=source_output,
            outputs=[build_output]
        )
        pipeline.add_stage(stage_name="Build", actions=[build_action])

        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "AppClientId", value=user_pool_client.user_pool_client_id)
        CfnOutput(self, "CognitoDomain", value=user_pool_domain.domain_name)
        CfnOutput(self, "FrontendUrl", value=cf_url)
        CfnOutput(self, "FrontendBucketName", value=frontend_bucket.bucket_name)
