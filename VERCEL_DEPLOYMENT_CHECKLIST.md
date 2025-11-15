# Vercel Deployment Checklist for ARBI Dashboard

## ✅ Code Status
- [x] All TypeScript React 19 errors fixed (9 components updated)
- [x] vercel.json optimized for Turborepo monorepo
- [x] Latest code pushed to: `claude/fix-railway-deployment-011MoX6xUtEHiYgyzYGHhra2`

## 🔧 Vercel Dashboard Configuration

### 1. Project Settings → General

**Root Directory:**
```
apps/dashboard
```
⚠️ **CRITICAL:** This must be set! Click "Edit" next to Root Directory and enter exactly: `apps/dashboard`

**Framework Preset:**
```
Next.js
```
✓ Should auto-detect

**Node.js Version:**
```
20.x (or latest LTS)
```
✓ Should auto-detect

### 2. Project Settings → Git

**Production Branch:**
```
claude/fix-railway-deployment-011MoX6xUtEHiYgyzYGHhra2
```
(Or change to `main` after merging the PR)

**Build Configuration:**
- Build Command: Uses vercel.json (auto-detected)
- Output Directory: `.next` (auto-detected)
- Install Command: Auto-detected (pnpm)

### 3. Project Settings → Environment Variables

Add the following:

**Name:** `NEXT_PUBLIC_API_URL`  
**Value:** `https://arbi-production.up.railway.app`  
**Environments:** Production, Preview, Development (select all)

Click **Save**

### 4. Trigger Deployment

After configuration:
1. Go to **Deployments** tab
2. Click **"Redeploy"** button (top right)
3. Or click **⋯** (three dots) on latest deployment → **Redeploy**
4. Ensure it pulls the latest commit: `49f5a06` or newer

## 📋 Expected Build Process

```
✓ Installing dependencies (pnpm)
✓ Running turbo build --filter=@arbi/dashboard
✓ Compiling Next.js (should succeed now!)
✓ Type checking passed
✓ Build completed
✓ Deployment ready
```

## 🧪 Testing After Deployment

Once deployed, test these URLs:

1. **Homepage:**
   ```
   https://arbidashboard.vercel.app/
   ```
   Should load the landing page or redirect to /dashboard

2. **Dashboard:**
   ```
   https://arbidashboard.vercel.app/dashboard
   ```
   Should show the dashboard overview

3. **Opportunities:**
   ```
   https://arbidashboard.vercel.app/dashboard/opportunities
   ```
   Should connect to Railway and show "0 opportunities found" (system not started yet)

4. **Health Check:**
   Test Railway connection from browser console:
   ```javascript
   fetch('https://arbi-production.up.railway.app/health')
     .then(r => r.json())
     .then(console.log)
   // Should return: {status: "ok", timestamp: "..."}
   ```

## ❌ Common Issues & Solutions

### Issue: "Deployment Not Found"
**Solution:** Root Directory not set. Go to Settings → General → Edit Root Directory → Enter `apps/dashboard`

### Issue: Build fails with TypeScript errors
**Solution:** Ensure building from latest commit (`49f5a06` or newer). Click Redeploy.

### Issue: "Module not found" errors
**Solution:** Vercel should auto-detect pnpm. If it doesn't, check pnpm-lock.yaml is committed.

### Issue: API connection fails (CORS or 404)
**Solution:** Verify `NEXT_PUBLIC_API_URL` environment variable is set correctly.

### Issue: Build succeeds but pages show 404
**Solution:** Root Directory is wrong. Must be `apps/dashboard`, not root.

## 🎯 Success Criteria

✅ Build completes without errors  
✅ Type checking passes  
✅ Dashboard loads at your Vercel URL  
✅ Can navigate to /dashboard/opportunities  
✅ Console shows no errors  
✅ Railway API connection works (check Network tab)

## 📞 Next Steps After Successful Deployment

1. Test all dashboard pages
2. Verify Railway API connection
3. Get eBay App ID and add to Railway
4. Start autonomous system
5. Watch opportunities flow in! 💰

---

**Current Status:**
- Railway Backend: ✅ Live at `https://arbi-production.up.railway.app`
- Vercel Dashboard: ⏳ Waiting for configuration + redeploy
- Code: ✅ All fixes committed and pushed

**Latest Commit:** `49f5a06` - Optimized Vercel config for Turborepo
