#!/bin/bash
set -e

echo "Deploying Tastelytics Backend Infrastructure..."

cd infra
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npx cdk deploy --require-approval never --outputs-file ./cdk-outputs.json
cd ..

echo "Generating aws-exports.js for the Frontend..."
python3 -c '
import json
import sys

try:
    with open("infra/cdk-outputs.json") as f:
        outputs = json.load(f)
    
    # Extract values from the TastelyticsStack
    stack_outputs = outputs.get("TastelyticsStack", {})
    user_pool_id = stack_outputs.get("UserPoolId", "")
    client_id = stack_outputs.get("AppClientId", "")
    domain = stack_outputs.get("CognitoDomain", "") + ".auth.us-east-1.amazoncognito.com"
    cf_url = stack_outputs.get("FrontendUrl", "")
    bucket_name = stack_outputs.get("FrontendBucketName", "")

    aws_exports = f"""const awsConfig = {{
  Auth: {{
    Cognito: {{
      userPoolId: "{user_pool_id}",
      userPoolClientId: "{client_id}",
      loginWith: {{
        oauth: {{
          domain: "{domain}",
          scopes: ["email", "profile", "openid"],
          redirectSignIn: ["http://localhost:5173", "{cf_url}"],
          redirectSignOut: ["http://localhost:5173", "{cf_url}"],
          responseType: "code"
        }}
      }}
    }}
  }}
}};
export default awsConfig;
"""
    with open("frontend/src/aws-exports.js", "w") as f:
        f.write(aws_exports)
    
    with open("frontend_deploy_info.txt", "w") as f:
        f.write(f"BUCKET={bucket_name}\nURL={cf_url}")

    print("aws-exports.js generated successfully!")
except Exception as e:
    print(f"Error generating aws-exports.js: {e}")
    sys.exit(1)
'

source frontend_deploy_info.txt

echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Deploying Frontend to S3..."
aws s3 sync ./frontend/dist s3://$BUCKET --delete

echo ""
echo "====================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Production URL: $URL"
echo "====================================================="
