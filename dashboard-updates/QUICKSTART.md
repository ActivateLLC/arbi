# 🚀 One-Command Dashboard Setup

## Option 1: Automated Install (Fastest - 30 seconds)

```bash
# Navigate to your dashboard repo
cd ~/path/to/01.04.26Arbi.ai

# Run the installer
curl -sL https://raw.githubusercontent.com/ActivateLLC/arbi/claude/reduce-repo-size-yo1br/dashboard-updates/INSTALL.sh | bash

# Test it
npm run dev

# Push to GitHub
git add .
git commit -m "Add marketplace integration"
git push origin main
```

**Done!** Deploy to Vercel and you're live.

---

## Option 2: Manual Copy (If you have arbi repo cloned)

```bash
# In your local machine where you cloned the arbi repo:
cd /path/to/arbi/dashboard-updates

# Run installer in your dashboard directory
./INSTALL.sh /path/to/01.04.26Arbi.ai

# Or copy manually:
cp App.tsx ~/path/to/01.04.26Arbi.ai/
cp vite.config.ts ~/path/to/01.04.26Arbi.ai/
cp services/arbiService.ts ~/path/to/01.04.26Arbi.ai/services/
cp components/MarketplaceStats.tsx ~/path/to/01.04.26Arbi.ai/components/
```

---

## Option 3: Download Individual Files

Go to GitHub and download these 4 files:

1. [App.tsx](https://raw.githubusercontent.com/ActivateLLC/arbi/claude/reduce-repo-size-yo1br/dashboard-updates/App.tsx)
2. [vite.config.ts](https://raw.githubusercontent.com/ActivateLLC/arbi/claude/reduce-repo-size-yo1br/dashboard-updates/vite.config.ts)
3. [services/arbiService.ts](https://raw.githubusercontent.com/ActivateLLC/arbi/claude/reduce-repo-size-yo1br/dashboard-updates/services/arbiService.ts)
4. [components/MarketplaceStats.tsx](https://raw.githubusercontent.com/ActivateLLC/arbi/claude/reduce-repo-size-yo1br/dashboard-updates/components/MarketplaceStats.tsx)

Place them in your `01.04.26Arbi.ai` repo.

---

## ✅ Verify It Works

```bash
cd 01.04.26Arbi.ai
npm install
npm run dev
```

Open `http://localhost:3000` and you should see:
- **Marketplace tab** showing 35 products
- Real data from api.arbi.creai.dev
- Top 5 products by profit
- Stats auto-refreshing

---

## 🚀 Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Add marketplace integration"
git push origin main

# Then go to vercel.com:
# 1. New Project
# 2. Import 01.04.26Arbi.ai
# 3. Add env variable: GEMINI_API_KEY=your_key
# 4. Deploy
```

**Live in 2 minutes!**

---

## 🐛 Troubleshooting

**"Failed to fetch marketplace listings"**
```bash
# Test API directly:
curl https://api.arbi.creai.dev/api/marketplace/listings

# Should return: {"success":true,"listings":[...]}
```

**"Cannot find module 'MarketplaceStats'"**
```bash
# Verify file exists:
ls -la components/MarketplaceStats.tsx
ls -la services/arbiService.ts
```

**"CORS error in production"**
- Add your Vercel domain to API CORS config
- In `arbi/apps/api/src/index.ts` line 59, add:
  ```typescript
  'https://your-project.vercel.app',
  ```

---

## 📖 Full Documentation

- `DEPLOYMENT-GUIDE.md` - Complete deployment walkthrough
- `API-REFERENCE.md` - All API endpoints with examples
- `README.md` - Overview and troubleshooting

---

**That's it!** Pick any option above and you'll be live in minutes.
