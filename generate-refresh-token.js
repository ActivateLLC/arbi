// Google Ads API OAuth2 Refresh Token Generator
// Usage: node generate-refresh-token.js

const readline = require('readline');
const { google } = require('googleapis');

const fs = require('fs');
const path = require('path');

// Try to load from client_secret.json
let CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
let CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;

try {
  const secretPath = path.join(__dirname, 'client_secret.json');
  if (fs.existsSync(secretPath)) {
    const secretData = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    if (secretData.web) {
      CLIENT_ID = CLIENT_ID || secretData.web.client_id;
      CLIENT_SECRET = CLIENT_SECRET || secretData.web.client_secret;
      console.log('Loaded credentials from client_secret.json');
    } else if (secretData.installed) {
      CLIENT_ID = CLIENT_ID || secretData.installed.client_id;
      CLIENT_SECRET = CLIENT_SECRET || secretData.installed.client_secret;
      console.log('Loaded credentials from client_secret.json');
    }
  }
} catch (e) {
  console.log('Could not load client_secret.json, using defaults/env vars');
}

// Fallback defaults (only if not found above)
CLIENT_ID = CLIENT_ID || '340956143036-qieq1pifsbh7lbc1dntp0avvtdcs6up1.apps.googleusercontent.com';
CLIENT_SECRET = CLIENT_SECRET || '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'; // Updated to match likely redirect URI in console

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
