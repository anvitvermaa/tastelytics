const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_NVakqJFEB",
      userPoolClientId: "hrv0sammndp8e6ee62ktm209a",
      loginWith: {
        oauth: {
          domain: "tastelytics-auth-app.auth.us-east-1.amazoncognito.com",
          scopes: ["email", "profile", "openid"],
          redirectSignIn: ["http://localhost:5173", "https://d36b12rj7f0r2u.cloudfront.net"],
          redirectSignOut: ["http://localhost:5173", "https://d36b12rj7f0r2u.cloudfront.net"],
          responseType: "code"
        }
      }
    }
  }
};
export default awsConfig;
