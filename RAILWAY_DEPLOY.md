# Railway Deployment Guide - Arbi MVP Backend

This guide will help you deploy the Arbi Arbitrage Engine backend to Railway using best practices for pnpm workspace monorepos.

## 🚀 Quick Deploy

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Connect to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `arbi` repository
   - Railway will automatically detect the pnpm monorepo

2. **Automatic Configuration**
   Railway automatically detects and configures:
   - Package manager: `pnpm` (via `packageManager` in package.json)
   - Build command: `pnpm install && pnpm build`
   - Start command: `pnpm --filter @arbi/api start`
   - Watch paths: `/apps/api/**` (prevents unnecessary rebuilds)

3. **Environment Variables**
   Set in Railway dashboard → Settings → Variables:

   **Required (Auto-set by Railway):**
   - `PORT` - Automatically set by Railway
   - `NODE_ENV` - Set to "production"

   **Optional (for full functionality):**
   - `OPENAI_API_KEY` - For AI features
   - `ELEVENLABS_API_KEY` - For voice interface
   - `PORCUPINE_ACCESS_KEY` - For wake word detection
   - `EBAY_APP_ID` - For eBay API integration
   - Database variables (if using external DB)
   - Redis variables (if using external cache)

### Option 2: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

## 📋 Configuration Files

Railway reads configuration in this priority order:

1. **railway.json** (Primary configuration)
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "pnpm install && pnpm build"
     },
     "deploy": {
       "startCommand": "pnpm --filter @arbi/api start"
     }
   }
   ```

2. **railway.toml** (Alternative format)
   ```toml
   [deploy]
   startCommand = "pnpm --filter @arbi/api start"
   ```

3. **nixpacks.toml** (Build configuration)
   ```toml
   [start]
   cmd = "pnpm --filter @arbi/api start"
   ```

4. **Procfile** (Fallback)
   ```
   web: pnpm --filter @arbi/api start
   ```

## 🏗️ Build Process

Railway performs these steps automatically:

1. **Setup Phase**
   - Installs Node.js 18 and pnpm
   - Detects pnpm workspace via `packageManager` field

2. **Install Phase**
   ```bash
   pnpm install
   ```
   - Installs all workspace dependencies
   - Uses pnpm's workspace protocol for internal packages

3. **Build Phase**
   ```bash
   pnpm build
   ```
   - Turbo runs `build` script across all packages
   - Compiles TypeScript in dependency order
   - Outputs to `apps/api/dist/index.js`

4. **Start Phase**
   ```bash
   pnpm --filter @arbi/api start
   ```
   - Uses pnpm's filter to run only the API package
   - Executes: `node dist/index.js` from `apps/api`

## ✅ Why pnpm --filter?

Railway recommends using `pnpm --filter` for monorepos because:

- ✅ Works from repository root (no need for `cd`)
- ✅ Automatically resolves workspace dependencies
- ✅ Ensures correct package isolation
- ✅ Follows Railway's monorepo best practices
- ✅ Avoids "executable 'cd' could not be found" errors

## 🏥 Health Checks

- **Endpoint**: `/health`
- **Response**: `{"status": "ok", "timestamp": "2024-..."}`
- **Timeout**: 100 seconds
- **Type**: HTTP GET

Railway automatically monitors this endpoint after deployment.

## 🔄 Restart Policy

- **Type**: `ON_FAILURE`
- **Max Retries**: 10
- **Behavior**: Restarts container if process exits with error

## 📦 Minimal MVP Deployment

The backend runs in MVP mode **without any API keys**:

✅ Mock data scouts for arbitrage opportunities
✅ All core API endpoints functional
✅ Health monitoring active
✅ Ready to scale with real API integrations

**API Endpoints Available:**
- `GET /health` - Health check
- `GET /api/arbitrage/health` - Arbitrage engine status
- `GET /api/arbitrage/opportunities` - Mock opportunities
- `POST /api/ai/chat` - AI chat (requires OPENAI_API_KEY)
- `POST /api/voice/transcribe` - Voice (requires ELEVENLABS_API_KEY)
- `POST /api/payment/create` - Payments (requires HYPERSWITCH_API_KEY)
- `POST /api/web/automate` - Web automation

## 🔧 Troubleshooting

### Build Fails

**Issue**: Dependencies not installing
```
Solution: Ensure pnpm@8.14.0 is set in package.json packageManager field
Check: Railway build logs for specific error
```

**Issue**: TypeScript compilation errors
```
Solution: Run `pnpm build` locally to identify errors
Check: Ensure all workspace dependencies are properly linked
```

### Deployment Fails

**Issue**: "The executable 'cd' could not be found"
```
Solution: Use pnpm --filter commands, not cd + node
✅ Correct: pnpm --filter @arbi/api start
❌ Wrong: cd apps/api && node dist/index.js
```

**Issue**: "Cannot find module"
```
Solution: Ensure pnpm build completed successfully
Check: Build logs for compilation errors
Verify: dist/index.js exists in build artifacts
```

### Server Won't Start

**Issue**: Port binding errors
```
Solution: Ensure your app uses process.env.PORT (Railway auto-sets this)
Check: apps/api/src/index.ts line 16: const port = process.env.PORT || 3000
```

**Issue**: Missing dependencies at runtime
```
Solution: Check package.json dependencies (not devDependencies)
Verify: NODE_ENV=production is set in Railway
```

### Health Check Fails

**Issue**: 503 Service Unavailable
```
Solution: Verify server started successfully in logs
Check: /health endpoint returns 200 OK
Ensure: Server binds to 0.0.0.0, not localhost
```

## 🎯 Optimization Tips

### 1. Watch Paths (Prevent Unnecessary Rebuilds)

In Railway dashboard → Settings → Watch Paths:
```
apps/api/**
packages/ai-engine/**
packages/arbitrage-engine/**
packages/data/**
packages/transaction/**
packages/voice-interface/**
packages/web-automation/**
```

This prevents changes in `apps/web` from triggering API rebuilds.

### 2. Deployment Size

The `.railwayignore` file excludes:
- Frontend app (`apps/web`)
- Development tools
- Test files
- Build artifacts (rebuilt on Railway)

### 3. Build Cache

Railway caches:
- `node_modules` (if package.json unchanged)
- pnpm store
- Turborepo cache

This speeds up subsequent deployments significantly.

## 📊 Monitoring

After deployment, monitor your app:

1. **Railway Dashboard**
   - View real-time logs
   - Check resource usage (CPU, Memory, Network)
   - Monitor deployment history

2. **Health Endpoint**
   ```bash
   curl https://your-app.railway.app/health
   ```

3. **API Status**
   ```bash
   curl https://your-app.railway.app/api/arbitrage/health
   ```

## 🚦 Next Steps

After successful deployment:

1. **Add API Keys** (in Railway dashboard)
   - `EBAY_APP_ID` - Enable real product data
   - `OPENAI_API_KEY` - Enable AI features
   - `ELEVENLABS_API_KEY` - Enable voice interface

2. **Set up Database** (Optional)
   - Add PostgreSQL via Railway
   - Configure connection variables
   - Run migrations

3. **Configure Redis** (Optional)
   - Add Redis via Railway
   - Set cache variables
   - Enable session storage

4. **Custom Domain** (Optional)
   - Settings → Domains
   - Add your custom domain
   - Configure DNS

5. **Enable Metrics**
   - Railway provides built-in metrics
   - Set up alerts for errors/downtime

## 📚 Additional Resources

- [Railway Monorepo Guide](https://docs.railway.com/guides/monorepo)
- [Nixpacks Documentation](https://nixpacks.com/docs/providers/node)
- [pnpm Workspace Documentation](https://pnpm.io/workspaces)
- [Railway CLI Reference](https://docs.railway.com/develop/cli)

## 🆘 Support

If you encounter issues:

1. Check Railway build/deploy logs
2. Review this troubleshooting guide
3. Test locally: `pnpm --filter @arbi/api start`
4. Contact Railway support: https://railway.app/help

---

**Railway Deployment Status**: ✅ Ready to Deploy

All configuration files are optimized for Railway's pnpm monorepo support.
