#!/usr/bin/env tsx

/**
 * Helper script to generate TikTok Access Token
 * 
 * Usage:
 * 1. Create an app in TikTok Developer Portal
 * 2. Set Redirect URI to: http://localhost:3000/api/auth/tiktok/callback
 * 3. Run this script: TIKTOK_APP_ID=xxx TIKTOK_APP_SECRET=xxx npx tsx scripts/get-tiktok-token.ts
 */

import express from 'express';
import axios from 'axios';
import open from 'open';

const app = express();
const port = 3000;

const APP_ID = process.env.TIKTOK_APP_ID;
const APP_SECRET = process.env.TIKTOK_APP_SECRET;
const REDIRECT_URI = `http://localhost:${port}/api/auth/tiktok/callback`;

if (!APP_ID || !APP_SECRET) {
  console.error('❌ Error: TIKTOK_APP_ID and TIKTOK_APP_SECRET environment variables are required');
  console.log('Usage: TIKTOK_APP_ID=xxx TIKTOK_APP_SECRET=xxx npx tsx scripts/get-tiktok-token.ts');
  process.exit(1);
}

// Step 1: Generate Authorization URL
const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${APP_ID}&scope=user.info.basic,video.list,video.upload&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=random_state_string`;

console.log('🚀 Starting TikTok OAuth Flow...');
console.log(`👉 Please open this URL in your browser to authorize the app:\n\n${authUrl}\n`);

// Step 2: Handle Callback
app.get('/api/auth/tiktok/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Error: No code received');
  }

  console.log(`✅ Received Authorization Code: ${code}`);
  res.send('Authorization successful! You can close this window and check your terminal.');

  try {
    // Step 3: Exchange Code for Access Token
    console.log('🔄 Exchanging code for access token...');
    
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
      client_key: APP_ID,
      client_secret: APP_SECRET,
      code: code as string,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, open_id, expires_in } = response.data.data;

    console.log('\n🎉 SUCCESS! TikTok Access Token Generated:\n');
    console.log(`TIKTOK_ACCESS_TOKEN=${access_token}`);
    console.log(`TIKTOK_REFRESH_TOKEN=${refresh_token}`);
    console.log(`TIKTOK_OPEN_ID=${open_id}`);
    console.log(`\nAdd these to your Railway variables or .env file.`);

    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error exchanging token:', error.response?.data || error.message);
    res.status(500).send('Error exchanging token. Check terminal for details.');
    process.exit(1);
  }
});

// Start server to listen for callback
app.listen(port, async () => {
  console.log(`👂 Listening for callback on port ${port}...`);
  
  // Try to open browser automatically
  try {
    // await open(authUrl);
  } catch (e) {
    // Ignore if fails (e.g. in headless environment)
  }
});
