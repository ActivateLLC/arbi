import { Router } from 'express';
import axios from 'axios';
import { adManager } from '../services/AdManager';

const router = Router();

const APP_ID = process.env.TIKTOK_APP_ID;
const APP_SECRET = process.env.TIKTOK_APP_SECRET;
// In production, this should be your actual domain
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://arbi.creai.dev/api/auth/tiktok/callback'
  : 'http://localhost:3000/api/auth/tiktok/callback';

router.get('/tiktok', (req, res) => {
  if (!APP_ID) {
    return res.status(500).json({ error: 'TikTok App ID not configured' });
  }

  const csrfState = Math.random().toString(36).substring(7);
  const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${APP_ID}&scope=user.info.basic,video.list,video.upload,ads.management&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${csrfState}`;

  res.redirect(url);
});

router.get('/tiktok/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !APP_ID || !APP_SECRET) {
    return res.status(400).send('Error: Missing code or configuration');
  }

  try {
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
      client_key: APP_ID,
      client_secret: APP_SECRET,
      code: code as string,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, open_id } = response.data.data;

    // In a real app, save these to the database associated with the user
    console.log('✅ TikTok Auth Success!');
    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token);

    // Update the running ad manager instance (temporary, until restart/DB load)
    // @ts-ignore
    adManager.config.accessToken = access_token;
    // @ts-ignore
    adManager.config.refreshToken = refresh_token;

    // Redirect back to frontend
    res.redirect('/?tiktok_connected=true');

  } catch (error: any) {
    console.error('TikTok Auth Error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

export default router;
