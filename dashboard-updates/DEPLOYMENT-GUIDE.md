# 🚀 Arbi.ai Dashboard - Deployment Guide

## ✅ Quick Setup (5 Minutes)

### Step 1: Update Files in Your Dashboard Repo

Copy these 2 files from `dashboard-updates/` to your `01.04.26Arbi.ai` repo:

```bash
# In your local machine where you have 01.04.26Arbi.ai cloned:
cp dashboard-updates/vite.config.ts ./vite.config.ts
cp dashboard-updates/App.tsx ./App.tsx
```

**What changed:**
- ✅ `vite.config.ts` - Added API proxy to route `/api/*` to `https://api.arbi.creai.dev`
- ✅ `App.tsx` - Added marketplace tab with real data integration

### Step 2: Verify Files Exist

Make sure these files already exist in your repo (they should):
- ✅ `services/arbiService.ts` - API integration
- ✅ `services/geminiService.ts` - Gemini AI integration
- ✅ `components/MarketplaceStats.tsx` - Marketplace UI
- ✅ `components/ControlPanel.tsx`
- ✅ `components/PipelineVisualizer.tsx`
- ✅ `components/TerminalLog.tsx`
- ✅ `components/RevenueChart.tsx`

### Step 3: Test Locally

```bash
cd 01.04.26Arbi.ai
npm install
npm run dev
```

Visit `http://localhost:3000` and you should see:
- **Marketplace tab** (default) - Shows your real products from api.arbi.creai.dev
- **Simulation tab** - Shows the demo arbitrage system

### Step 4: Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

#### Option B: Via GitHub (Recommended)
1. Push changes to GitHub:
```bash
git add .
git commit -m "Add marketplace integration with Arbi API"
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import `01.04.26Arbi.ai` repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

6. Add Environment Variable:
   - Key: `GEMINI_API_KEY`
   - Value: [Your Gemini API key]

7. Click "Deploy"

### Step 5: Configure Custom Domain (Optional)

In Vercel:
1. Go to Project Settings → Domains
2. Add domain: `dashboard.arbi.ai` or `admin.arbi.ai`
3. Add DNS records as shown
4. Wait for SSL certificate (automatic)

---

## 🔧 Environment Variables

### Required:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Optional (if running standalone):
```bash
# Not needed for Vercel - the proxy handles API routing
# API_BASE_URL=https://api.arbi.creai.dev
```

---

## 📊 What You'll See After Deployment

### Marketplace Tab (Real Data)
```
┌─────────────────────────────────────────────┐
│  Live Marketplace                            │
│  Real-time data from api.arbi.creai.dev      │
├─────────────────────────────────────────────┤
│  Active Products: 35                         │
│  Potential Revenue: $52,847                  │
│  Potential Profit: $14,320                   │
│  Avg Margin: $749                            │
│                                              │
│  🏆 Top Profit Products                      │
│  1. Sony Alpha A7 IV - $749 profit           │
│  2. Apple MacBook Air M2 - $687 profit       │
│  3. Roland TD-17KVX Drums - $516 profit      │
│  ...                                         │
└─────────────────────────────────────────────┘
```

### Simulation Tab (Demo)
- Arbitrage simulation controls
- Pipeline visualizer
- Terminal logs
- Revenue charts

---

## 🔍 API Endpoints Used

Your dashboard connects to these endpoints:

```typescript
// Marketplace Data
GET  /api/marketplace/listings          // ✅ Main data source

// Image Management (future features)
POST /api/scrape-rainforest/:listingId  // Fetch product images
POST /api/scrape-amazon-buddy/:listingId

// Campaign Management (future)
POST /api/campaigns/launch/:listingId   // Launch Google Ads
GET  /api/campaigns/status              // Campaign performance

// Suppliers (future)
GET  /api/suppliers/:listingId          // Supplier info
POST /api/suppliers/monitor/check       // Stock monitoring
```

**How the proxy works:**
```
Browser → /api/marketplace/listings
         ↓
Vite Dev Server (localhost:3000)
         ↓
Proxy → https://api.arbi.creai.dev/api/marketplace/listings
         ↓
Your Railway API → PostgreSQL → Response
```

No CORS issues! 🎉

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch marketplace listings"
**Solution:**
- Check that `https://api.arbi.creai.dev/api/marketplace/listings` is accessible
- Test: `curl https://api.arbi.creai.dev/api/marketplace/listings`
- Verify Railway deployment is running

### Issue: Empty marketplace data
**Solution:**
- Ensure you have listings in your database
- Create a test listing:
```bash
curl -X POST https://api.arbi.creai.dev/api/marketplace/list \
  -H "Content-Type: application/json" \
  -d '{
    "productTitle": "Test Product",
    "productPrice": 100,
    "supplierCost": 50,
    "supplierUrl": "https://amazon.com/dp/TEST"
  }'
```

### Issue: Gemini logs not generating
**Solution:**
- Add `GEMINI_API_KEY` to Vercel environment variables
- Redeploy after adding the variable

### Issue: Localhost works, production doesn't
**Solution:**
- Vercel doesn't use the Vite proxy - it directly calls the API
- This is fine! The API has CORS configured for your domains
- Check `apps/api/src/index.ts` includes your Vercel domain in CORS config

---

## 🚀 Next Features to Add

### 1. Product Image Manager
Add "Fetch Images" button to products with < 3 images

### 2. Campaign Launcher
Add "Launch Ad" button to create Google Ads campaigns

### 3. Supplier Dashboard
Show supplier stock status and auto-failover

### 4. Real-Time Updates
Add WebSocket connection for live order notifications

### 5. Analytics
Integrate Google Ads performance metrics

---

## 📝 File Structure

```
01.04.26Arbi.ai/
├── App.tsx                    # ✅ UPDATED - Main app with tabs
├── index.tsx                  # Entry point
├── index.html                 # HTML template
├── vite.config.ts            # ✅ UPDATED - Added proxy
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── types.ts                  # Type definitions
├── metadata.json             # App metadata
├── components/
│   ├── MarketplaceStats.tsx  # ✅ Real marketplace data
│   ├── ControlPanel.tsx      # Simulation controls
│   ├── PipelineVisualizer.tsx
│   ├── TerminalLog.tsx
│   └── RevenueChart.tsx
└── services/
    ├── arbiService.ts        # ✅ API integration
    └── geminiService.ts      # AI log generation
```

---

## ✅ Deployment Checklist

- [ ] Updated `vite.config.ts` with proxy
- [ ] Updated `App.tsx` with marketplace tab
- [ ] Tested locally (`npm run dev`)
- [ ] Committed changes to git
- [ ] Pushed to GitHub
- [ ] Created Vercel project
- [ ] Added `GEMINI_API_KEY` environment variable
- [ ] Deployed successfully
- [ ] Verified marketplace tab shows real data
- [ ] (Optional) Configured custom domain

---

## 🎯 URLs After Deployment

**Development:**
- Local: `http://localhost:3000`
- API: `https://api.arbi.creai.dev`

**Production:**
- Dashboard: `https://your-project.vercel.app`
- Custom Domain: `https://dashboard.arbi.ai` (if configured)
- API: `https://api.arbi.creai.dev` (remains the same)

---

## 💡 Pro Tips

1. **Auto-Deploy**: Enable automatic deployments in Vercel settings
2. **Preview URLs**: Every git push creates a preview deployment
3. **Logs**: Check Vercel logs if marketplace data doesn't load
4. **Cache**: Force refresh (Cmd+Shift+R / Ctrl+Shift+R) if changes don't appear
5. **Mobile**: Dashboard is fully responsive - works on phones!

---

## 🎉 You're Done!

Your dashboard is now:
- ✅ Connected to your live Arbi API
- ✅ Showing real marketplace data
- ✅ Auto-refreshing every 30 seconds
- ✅ Deployed to Vercel with global CDN
- ✅ Ready to scale

**Next:** Add more features like campaign management, image scraping, and supplier monitoring!
