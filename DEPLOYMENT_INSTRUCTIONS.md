# 🚀 Deployment Instructions

## Current Status
Your production site (`api.arbi.creai.dev`) is showing the OLD emoji icons because the updated code hasn't been deployed yet.

The changes have been committed to the branch `claude/reduce-repo-size-yo1br`:
- ✅ Commit: `6bacf47e0` - "Replace emoji icons with professional Lucide SVG icons"
- ✅ Changes pushed to remote

---

## 🔄 To Deploy the Updated Icons to Production

### Option 1: Railway Deployment (Recommended)
If you're using Railway for hosting:

1. **Log into Railway Dashboard**
   - Go to: https://railway.app/dashboard
   - Find your `arbi-api` service

2. **Trigger Deployment**
   - Click on your service
   - Go to "Deployments" tab
   - Click "Deploy" button
   - Or configure Railway to auto-deploy from your branch

3. **Configure Auto-Deploy** (optional)
   - Go to Settings → Deploy
   - Set branch to: `claude/reduce-repo-size-yo1br`
   - Enable "Auto-deploy on push"

### Option 2: Manual Deployment
If you have SSH access to your production server:

```bash
# SSH into production server
ssh user@api.arbi.creai.dev

# Pull latest changes
cd /path/to/arbi
git fetch origin
git checkout claude/reduce-repo-size-yo1br
git pull origin claude/reduce-repo-size-yo1br

# Restart the API service
pm2 restart arbi-api
# OR
systemctl restart arbi-api
# OR
docker-compose restart api
```

### Option 3: Merge to Main Branch
If production deploys from main/master:

```bash
# Create a Pull Request from your branch
# OR merge directly:
git checkout main
git merge claude/reduce-repo-size-yo1br
git push origin main
```

---

## 🧪 Verify Deployment

After deployment, check these URLs to confirm icons are updated:

1. **MacBook Air Page**:
   https://api.arbi.creai.dev/product/listing_1766360506926_eqhem4m2z

2. **Security System Page**:
   https://api.arbi.creai.dev/product/listing_1768211941347_yl08c010p

**What to look for**:
- SVG icons instead of emojis (🟢 🚚 🔒)
- Color-coded icons:
  - Green check circle (In Stock)
  - Orange truck (48h Dispatch)
  - Purple lock (Stripe Secured)
  - Purple arrow (30-Day Return)

---

## 📝 Changes Deployed

When deployed, all 38 product pages will have:
- ✅ Modern Lucide SVG icons
- ✅ Professional appearance
- ✅ Better mobile responsiveness
- ✅ Color-coded status indicators

---

## 🔑 Next Steps: Google Ads Setup

Once deployment is complete, we can configure Google Ads API with your credentials!

Add to `apps/api/.env`:
```bash
GOOGLE_ADS_DEVELOPER_TOKEN=your_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
```

Then redeploy to activate Google Ads integration! 🚀
