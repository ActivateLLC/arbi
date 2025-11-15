# Vercel Deployment Guide for ARBI Dashboard

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/new
2. **Import Git Repository**:
   - Click "Import Project"
   - Select GitHub repository: `ActivateLLC/arbi`
   - Select branch: `claude/fix-railway-deployment-011MoX6xUtEHiYgyzYGHhra2`

3. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/dashboard`
   - **Build Command**: `pnpm build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `pnpm install` (auto-detected)

4. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = https://your-railway-app.railway.app
   ```
   (Replace with your actual Railway deployment URL)

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Your dashboard will be live at `https://your-project.vercel.app`

---

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Navigate to dashboard directory
cd apps/dashboard

# Login to Vercel
vercel login

# Deploy (first time - interactive)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account/team)
# - Link to existing project? No
# - What's your project's name? arbi-dashboard
# - In which directory is your code located? ./
# - Want to override the settings? No

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
# Enter your Railway URL when prompted

# Deploy to production
vercel --prod
```

---

### Option 3: Auto-Deploy on Push (Continuous Deployment)

1. **Connect GitHub to Vercel**:
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import from GitHub: `ActivateLLC/arbi`
   - Configure as described in Option 1

2. **Enable Auto-Deploy**:
   - Vercel will automatically detect pushes to your branch
   - Every push to `claude/fix-railway-deployment-011MoX6xUtEHiYgyzYGHhra2` = new deployment
   - Production deployments from main branch
   - Preview deployments from feature branches

---

## Configuration Files

### vercel.json (Already Created)

Location: `apps/dashboard/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@railway_api_url"
  }
}
```

### Environment Variables

**Production (.env.production)**:
```env
NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
```

**Development (.env.local)** - Already created:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Post-Deployment Steps

### 1. Verify Deployment

Visit your Vercel URL and check:
- ✅ Dashboard loads successfully
- ✅ No console errors
- ✅ API connection works (check Network tab)

### 2. Test API Integration

1. Navigate to `/dashboard/opportunities`
2. Check if opportunities load from Railway backend
3. If you see connection errors:
   - Verify `NEXT_PUBLIC_API_URL` is set correctly
   - Check Railway backend is running
   - Ensure CORS is enabled on Railway (already configured)

### 3. Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your domain: `dashboard.arbi.app`
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Troubleshooting

### Build Fails

**Error**: Module not found
- **Fix**: Run `pnpm install` locally to ensure all deps are in package.json

**Error**: Type errors
- **Fix**: Run `pnpm build` locally to catch TypeScript issues

### API Connection Fails

**Error**: Failed to fetch from API
- **Fix**: Check `NEXT_PUBLIC_API_URL` environment variable
- **Fix**: Ensure Railway backend is running
- **Fix**: Check Railway logs for CORS issues

### Peer Dependency Warnings

```
WARN Issues with peer dependencies found
```
- **Impact**: Non-critical, build will succeed
- **Fix**: Can ignore or update dependencies

---

## Monorepo Deployment Notes

### Why Root Directory = `apps/dashboard`?

Vercel needs to know which app to build in the monorepo:
- ✅ Root Directory: `apps/dashboard`
- ✅ Vercel will automatically detect pnpm workspace
- ✅ Dependencies from packages/* will be included

### Build Performance

- First build: ~3-5 minutes (installing all deps)
- Subsequent builds: ~1-2 minutes (cached)
- Vercel auto-detects Turborepo for faster builds

---

## Commands Reference

### Local Development
```bash
# From monorepo root
pnpm dev:dashboard

# From apps/dashboard
pnpm dev
```

### Build & Test Locally
```bash
# From monorepo root
pnpm build:dashboard

# From apps/dashboard
pnpm build
pnpm start
```

### Deploy to Vercel
```bash
cd apps/dashboard
vercel --prod
```

---

## Expected Result

After successful deployment, you'll have:

- **Production URL**: `https://arbi-dashboard.vercel.app`
- **Preview URLs**: Auto-generated for each PR
- **Auto-deploys**: On every push to GitHub
- **Edge network**: Deployed to 100+ global locations
- **Analytics**: Built-in performance monitoring
- **Logs**: Real-time function logs

---

## Next Steps After Deployment

1. ✅ Set `NEXT_PUBLIC_API_URL` to Railway production URL
2. ✅ Test opportunities feed with real data
3. ✅ Configure custom domain (optional)
4. ✅ Enable Vercel Analytics (optional)
5. ✅ Set up monitoring alerts (optional)

Your ARBI dashboard is now live! 🚀

Users can access it at your Vercel URL and start viewing autonomous arbitrage opportunities in real-time.
