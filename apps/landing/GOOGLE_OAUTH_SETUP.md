# Google OAuth Setup for Supabase

## Your Credentials
```
Client ID: usualprovider@gmail.com
Client Secret: Only1God____
Redirect URI: https://rsaayhbscztgvojhoxia.supabase.co/auth/v1/callback
```

## Setup Steps (2 minutes)

### 1. Enable Google Provider in Supabase

1. Go to: **https://app.supabase.com/project/rsaayhbscztgvojhoxia/auth/providers**

2. Scroll to **Google** provider

3. Click the toggle to **Enable** it

4. Paste your credentials:
   - **Client ID (for OAuth)**: `usualprovider@gmail.com`
   - **Client Secret (for OAuth)**: `Only1God____`

5. Click **Save**

### 2. Verify Redirect URL

The redirect URL should already be set in your Google OAuth app:
```
https://rsaayhbscztgvojhoxia.supabase.co/auth/v1/callback
```

If not, add it in Google Cloud Console → OAuth 2.0 Client IDs → Authorized redirect URIs

### 3. Test It!

Once saved:
1. Refresh your Arbi site
2. Click "Continue with Google"
3. Authorize with Google
4. You'll be redirected back and logged in automatically!

## Troubleshooting

**If you get "Unsupported provider" error:**
- Make sure Google toggle is ON in Supabase
- Click Save after entering credentials
- Wait 30 seconds for changes to propagate

**If redirect fails:**
- Verify the callback URL matches exactly in Google Console
- Check there are no extra spaces in Client ID/Secret

## GitHub OAuth (Optional)

To enable GitHub login:
1. Go to: https://github.com/settings/developers
2. Create new OAuth App
3. Use same callback URL: `https://rsaayhbscztgvojhoxia.supabase.co/auth/v1/callback`
4. Add credentials in Supabase → Auth → Providers → GitHub
