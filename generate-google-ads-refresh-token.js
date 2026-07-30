#!/usr/bin/env node

/**
 * Google Ads Refresh Token Generator
 *
 * This script generates a fresh Google Ads refresh token using OAuth 2.0
 * Run this script and follow the prompts.
 */

const http = require('http');
const { URL } = require('url');

// Google Ads OAuth Configuration
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3030/oauth2callback';
const SCOPE = 'https://www.googleapis.com/auth/adwords';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET environment variables must be set');
  console.error('\nUsage:');
  console.error('  GOOGLE_ADS_CLIENT_ID=your_client_id GOOGLE_ADS_CLIENT_SECRET=your_secret node generate-google-ads-refresh-token.js');
  process.exit(1);
}

console.log('🔐 Google Ads Refresh Token Generator\n');
console.log('Client ID:', CLIENT_ID.substring(0, 20) + '...');
console.log('Redirect URI:', REDIRECT_URI);
console.log('Scope:', SCOPE);
console.log('');

// Step 1: Generate authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline'); // CRITICAL: Request refresh token
authUrl.searchParams.set('prompt', 'consent'); // Force consent screen to get refresh token

console.log('📋 Step 1: Authorize this application');
console.log('');
console.log('Opening browser to authorize...');
console.log('If browser does not open, visit this URL manually:');
console.log('');
console.log(authUrl.toString());
console.log('');

// Step 2: Start local server to receive OAuth callback
let server;
const serverPromise = new Promise((resolve, reject) => {
  server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    if (reqUrl.pathname === '/oauth2callback') {
      const code = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
              <h1 style="color: #f44336;">❌ Authorization Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        reject(new Error(`Authorization failed: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
              <h1 style="color: #f44336;">❌ Missing Authorization Code</h1>
              <p>No authorization code received.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        reject(new Error('No authorization code received'));
        return;
      }

      console.log('✅ Authorization code received');
      console.log('🔄 Exchanging code for refresh token...');
      console.log('');

      // Step 3: Exchange authorization code for tokens
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1 style="color: #f44336;">❌ Token Exchange Failed</h1>
                <p>Error: ${tokens.error}</p>
                <p>Description: ${tokens.error_description || 'Unknown error'}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          reject(new Error(`Token exchange failed: ${tokens.error}`));
          return;
        }

        if (!tokens.refresh_token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1 style="color: #ff9800;">⚠️ No Refresh Token Received</h1>
                <p>This usually means you've already authorized this app before.</p>
                <p>To get a new refresh token:</p>
                <ol style="text-align: left; display: inline-block;">
                  <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a></li>
                  <li>Remove access for this app</li>
                  <li>Run this script again</li>
                </ol>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          reject(new Error('No refresh token received. Revoke app access and try again.'));
          return;
        }

        // Success!
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
              <h1 style="color: #4CAF50;">✅ Success!</h1>
              <p>Refresh token generated successfully.</p>
              <p>Check your terminal for the token.</p>
              <p style="margin-top: 30px; color: #666;">You can close this window.</p>
            </body>
          </html>
        `);

        resolve(tokens);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
              <h1 style="color: #f44336;">❌ Error</h1>
              <p>${error.message}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        reject(error);
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(3030, () => {
    console.log('🌐 Local server started on http://localhost:3030');
    console.log('⏳ Waiting for authorization...');
    console.log('');
    console.log('👉 Please open the authorization URL above in your browser');
    console.log('');
  });
});

// Wait for OAuth flow to complete
serverPromise
  .then((tokens) => {
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Refresh Token Generated');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('🔑 GOOGLE_ADS_REFRESH_TOKEN:');
    console.log('');
    console.log(tokens.refresh_token);
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('');
    console.log('1. Copy the refresh token above');
    console.log('2. Update Railway environment variable:');
    console.log('   GOOGLE_ADS_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('');
    console.log('3. Redeploy your API service in Railway');
    console.log('');
    console.log('4. Test Google Ads campaign creation');
    console.log('');
    console.log('💡 This refresh token does NOT expire and can be reused.');
    console.log('');

    server.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');

    if (server) {
      server.close();
    }
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted. Closing server...');
  if (server) {
    server.close();
  }
  process.exit(1);
});
