import json
import os
import pytest
from moto import mock_aws
import boto3

# Set environment variables for testing before importing app
os.environ['DYNAMODB_TABLE'] = 'TestReviews'
os.environ['PLAYLISTS_TABLE'] = 'TestPlaylists'
os.environ['USERS_TABLE'] = 'TestUsers'
os.environ['SPOTIFY_CLIENT_ID'] = 'dummy'
os.environ['SPOTIFY_CLIENT_SECRET'] = 'dummy'

from app import cors_response, handler

@pytest.fixture
def aws_credentials():
    """Mocked AWS Credentials for moto."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"

@pytest.fixture
def dynamodb(aws_credentials):
    with mock_aws():
        yield boto3.resource('dynamodb', region_name='us-east-1')

@pytest.fixture
def setup_tables(dynamodb):
    # Create mock tables
    dynamodb.create_table(
        TableName='TestUsers',
        KeySchema=[{'AttributeName': 'UserID', 'KeyType': 'HASH'}],
        AttributeDefinitions=[{'AttributeName': 'UserID', 'AttributeType': 'S'}],
        ProvisionedThroughput={'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
    )
    yield

def test_cors_response():
    resp = cors_response(200, {"message": "success"})
    assert resp['statusCode'] == 200
    assert resp['headers']['Access-Control-Allow-Origin'] == 'https://tastelytics.app'
    assert json.loads(resp['body'])['message'] == 'success'

def test_handler_search_missing_query():
    event = {
        "httpMethod": "GET",
        "path": "/search",
        "queryStringParameters": {}
    }
    response = handler(event, None)
    assert response['statusCode'] == 400

def test_handler_get_profile_not_found(setup_tables):
    event = {
        "httpMethod": "GET",
        "path": "/profile",
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "nonexistent"
                }
            }
        }
    }
    response = handler(event, None)
    assert response['statusCode'] == 404
