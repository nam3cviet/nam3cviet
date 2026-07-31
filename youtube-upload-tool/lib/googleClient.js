const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function createAuthedClient(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

module.exports = { SCOPES, createOAuth2Client, createAuthedClient };
