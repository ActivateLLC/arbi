#!/usr/bin/env node
/**
 * Mint a fresh Google Ads API refresh token (fixes `invalid_grant`).
 *
 * PREREQ: In Google Cloud Console → your OAuth 2.0 Client (Web application),
 * add this Authorized redirect URI:
 *     http://localhost:3939/oauth2callback
 *
 * RUN (from apps/api, with the SAME client id/secret that's in Railway):
 *     GOOGLE_ADS_CLIENT_ID=xxxx GOOGLE_ADS_CLIENT_SECRET=yyyy \
 *       node scripts/get-google-ads-refresh-token.js
 *
 * It prints an auth URL. Open it, sign in with the Google account that has
 * access to your Google Ads account, approve, and the script prints your
 * GOOGLE_ADS_REFRESH_TOKEN. Paste that into Railway and redeploy.
 *
 * NOTE: if your OAuth consent screen is still in "Testing", refresh tokens
 * expire after 7 days — publish it ("In production") to make them durable.
 */
const http = require('http');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const PORT = 3939;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET env vars first.');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // force a fresh refresh_token
  scope: ['https://www.googleapis.com/auth/adwords'],
});

console.log('\n1) Confirm this redirect URI is authorized on your OAuth client:');
console.log('   ' + REDIRECT);
console.log('\n2) Open this URL, sign in, and approve:\n');
console.log(authUrl + '\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) { res.end('ok'); return; }
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  if (!code) { res.end('No code in callback.'); return; }
  try {
    const { tokens } = await oauth2.getToken(code);
    res.end('✅ Success! Copy the refresh token from your terminal. You can close this tab.');
    console.log('\n==================================================');
    console.log('✅ GOOGLE_ADS_REFRESH_TOKEN:\n');
    console.log('   ' + tokens.refresh_token);
    console.log('\nSet that in Railway as GOOGLE_ADS_REFRESH_TOKEN, then redeploy.');
    console.log('==================================================\n');
  } catch (e) {
    res.end('Token exchange failed: ' + e.message);
    console.error('❌ Token exchange failed:', e.message);
  } finally {
    server.close();
    process.exit(0);
  }
});
server.listen(PORT, () => console.log(`Waiting for the OAuth redirect on ${REDIRECT} ...\n`));
