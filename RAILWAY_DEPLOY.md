# Railway Deployment Guide

This guide will help you deploy the Arbi Arbitrage Engine backend to Railway.

## Quick Deploy

1. **Connect to Railway**
   - Go to [railway.app](https://railway.app)
   - Create a new project
   - Connect your GitHub repository

2. **Configuration**
   Railway will automatically detect the configuration from:
   - `nixpacks.toml` - Nixpacks build configuration
   - `railway.toml` - Railway deployment settings
   - `Procfile` - Fallback process definition

3. **Environment Variables**
   Set these required environment variables in Railway dashboard:

   **Required:**
   - `PORT` - Automatically set by Railway (default: 3000)
   - `NODE_ENV` - Set to "production"

   **Optional (for full functionality):**
   - `OPENAI_API_KEY` - For AI features
   - `ELEVENLABS_API_KEY` - For voice interface
   - `PORCUPINE_ACCESS_KEY` - For wake word detection
   - `EBAY_APP_ID` - For eBay API integration
   - Database variables (if using external DB)
   - Redis variables (if using external cache)

4. **Verify Deployment**
   - Check the health endpoint: `https://your-app.railway.app/health`
   - Test API endpoints: `https://your-app.railway.app/api/arbitrage/health`

## Build Process

Railway will:
1. Install dependencies with `pnpm install --no-frozen-lockfile`
2. Build all packages with `pnpm build`
3. Start the API server with `node apps/api/dist/index.js`

**Note:** The start command uses an absolute path from the repository root to avoid shell builtin dependencies. Alternative start methods:
- Direct: `node apps/api/dist/index.js`
- Script: `./start.sh` (includes startup diagnostics)

## Health Checks

- Health check endpoint: `/health`
- Returns: `{"status": "ok", "timestamp": "..."}`
- Timeout: 100 seconds

## Restart Policy

- Type: ON_FAILURE
- Max Retries: 10

## Minimal MVP Deployment

The backend will run in MVP mode without API keys:
- Uses mock data scouts for arbitrage opportunities
- All core API endpoints functional
- Ready to scale with real API integrations

## Troubleshooting

### Build fails
- Check build logs in Railway dashboard
- Verify all packages build locally: `pnpm build`

### Server won't start
- Check environment variables are set
- Verify PORT is set (Railway sets this automatically)
- Check logs for missing dependencies

### Health check fails
- Ensure server is listening on PORT from environment
- Verify `/health` endpoint is accessible
- Check server logs for startup errors

## Next Steps

After successful deployment:
1. Add your API keys for full functionality
2. Set up database (PostgreSQL recommended)
3. Configure Redis for caching
4. Enable CORS for your frontend domain
5. Set up monitoring and alerts
