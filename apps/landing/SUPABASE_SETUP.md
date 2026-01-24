# Supabase Authentication Setup

## ✅ Completed Setup

The Arbi application is now integrated with Supabase authentication. Email/password authentication works out of the box.

## OAuth Provider Configuration

To enable Google and GitHub social authentication, follow these steps:

### 1. Access Supabase Dashboard

Go to: https://app.supabase.com/project/rsaayhbscztgvojhoxia/auth/providers

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set the authorized redirect URIs to:
   ```
   https://rsaayhbscztgvojhoxia.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**
5. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable Google provider
   - Paste Client ID
   - Paste Client Secret
   - Save

### 3. Configure GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Arbi Intelligent Arbitrage
   - **Homepage URL**: https://yourdomain.com
   - **Authorization callback URL**:
     ```
     https://rsaayhbscztgvojhoxia.supabase.co/auth/v1/callback
     ```
4. Copy the **Client ID** and generate a **Client Secret**
5. In Supabase Dashboard → Authentication → Providers → GitHub:
   - Enable GitHub provider
   - Paste Client ID
   - Paste Client Secret
   - Save

### 4. Update Site URL (Optional)

In Supabase Dashboard → Authentication → URL Configuration:
- Set **Site URL** to your production domain (e.g., `https://arbi.com`)
- Add redirect URLs for local development:
  - `http://localhost:4200`
  - `http://localhost:4200/auth/callback`

## Email Confirmation (Optional)

By default, Supabase requires email confirmation for new signups.

To disable for faster testing:
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Disable "Confirm email"

For production, keep it enabled for security.

## Features Now Available

✅ **Email/Password Authentication**
- Sign up with email and password
- Sign in with credentials
- Password reset via email
- Session persistence

✅ **Social Authentication** (after OAuth setup)
- Sign in with Google (one-click)
- Sign in with GitHub (one-click)
- Automatic account creation
- Email verification handled by provider

✅ **Session Management**
- Auto-restore sessions on page reload
- Secure token storage
- Auto-refresh tokens
- Sign out from all devices

## Testing Authentication

1. **Email/Password Signup**:
   - Click "Get Started" or "Sign In"
   - Switch to "Sign up" tab
   - Enter email and password
   - Submit (check email if confirmation is enabled)

2. **Email/Password Login**:
   - Click "Sign In"
   - Enter credentials
   - Submit

3. **Social Login** (after OAuth setup):
   - Click "Continue with Google" or "Continue with GitHub"
   - Authorize the app
   - You'll be redirected back and logged in

4. **Password Reset**:
   - Click "Sign In"
   - Click "Forgot password?"
   - Enter email
   - Check email for reset link

## Environment Variables

The app uses these Supabase credentials (already configured):

```typescript
SUPABASE_URL=https://rsaayhbscztgvojhoxia.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These are stored in `src/environment.ts` and are safe to use in the client.

## Security Notes

- ✅ Anon key is safe for client-side use
- ✅ Service role key is NOT in client code (server-side only)
- ✅ Row Level Security (RLS) should be enabled in Supabase
- ✅ OAuth redirect URLs are validated by Supabase
- ✅ Passwords are hashed and never stored in plain text

## Next Steps

1. **Set up OAuth providers** (Google & GitHub) using steps above
2. **Test all auth flows** (signup, login, social auth, password reset)
3. **Configure email templates** in Supabase for branding
4. **Enable Row Level Security** for database tables
5. **Add user profile storage** (optional)

## Support

For Supabase-specific issues:
- [Supabase Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Discord](https://discord.supabase.com/)

For OAuth setup issues:
- [Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [GitHub OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-github)
