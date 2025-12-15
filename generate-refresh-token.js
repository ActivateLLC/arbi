// Google Ads API OAuth2 Refresh Token Generator
// Usage: node generate-refresh-token.js

const readline = require('readline');
const { google } = require('googleapis');

// Fill these in with your credentials
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '340956143036-qieq1pifsbh7lbc1dntp0avvtdcs6up1.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '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';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('Authorize this app by visiting this url:\n', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token', err);
      process.exit(1);
    }
    console.log('\nYour refresh token is:\n');
    console.log(token.refresh_token);
    rl.close();
  });
});
