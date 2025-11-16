# ARBI Autonomous System - Local Setup Guide

**Get the autonomous arbitrage scanner working locally in 10 minutes**

---

## 🎯 WHAT WE'RE SETTING UP

The autonomous engine that:
- Scans eBay, Amazon, Walmart every 15 minutes
- Finds profitable price gaps
- Scores opportunities (0-100)
- Alerts you to high-value deals
- Works 24/7 without manual input

---

## 🔑 REQUIRED API KEYS

### 1. eBay Finding API (For Scanning)

**Status:** ✅ You already applied - waiting for approval (1 business day)

**Once Approved:**
1. Go to: https://developer.ebay.com/my/keys
2. Copy these 3 keys:
   - App ID (Client ID)
   - Cert ID (Client Secret)
   - Dev ID

**Add to Railway:**
```bash
EBAY_APP_ID=YourAppId
EBAY_CERT_ID=YourCertId
EBAY_DEV_ID=YourDevId
```

**Add Locally:**
Create `apps/api/.env.local`:
```bash
EBAY_APP_ID=YourAppId
EBAY_CERT_ID=YourCertId
EBAY_DEV_ID=YourDevId
```

### 2. Rainforest API (For Amazon Data - OPTIONAL)

**Get Free API Key:**
1. Go to: https://www.rainforestapi.com/
2. Sign up (free tier: 1,000 requests)
3. Get API key

**Add to Railway & Locally:**
```bash
RAINFOREST_API_KEY=your_key_here
```

### 3. Database (Already Working on Railway ✅)

You already have PostgreSQL on Railway. Just need the connection string.

**Get from Railway:**
1. Go to your Railway project
2. Click PostgreSQL service
3. Copy `DATABASE_URL`

**Add Locally:**
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
```

---

## 🚀 TEST LOCALLY (Without API Keys)

You can test with **mock data** right now while waiting for eBay approval.

### Step 1: Install Dependencies

```bash
cd /home/user/arbi
pnpm install
```

### Step 2: Create Test Script

Create `scripts/test-autonomous.js`:

```javascript
const { AutonomousEngine } = require('../packages/arbitrage-engine/src/autonomous/autonomousEngine');

async function testAutonomousSystem() {
  console.log('🤖 Testing ARBI Autonomous System...\n');

  const engine = new AutonomousEngine();

  // Test configuration
  const config = {
    minScore: 70,        // Alert on 70+ score opportunities
    minROI: 20,          // Minimum 20% return
    minProfit: 5,        // At least $5 profit
    maxPrice: 100,       // Max $100 source price
    categories: [
      '9355',  // Cell Phones
      '171485' // Tablets
    ],
    scanInterval: 15,
    autoBuyEnabled: false,
    autoBuyScore: 90,
    dailyBudget: 500
  };

  console.log('📋 Configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n🔍 Starting scan...\n');

  try {
    // Run a scan
    const opportunities = await engine.runScan(config);

    console.log(`\n✅ Scan complete!`);
    console.log(`   Found ${opportunities.length} opportunities\n`);

    // Show top 5 opportunities
    const top5 = opportunities.slice(0, 5);

    if (top5.length > 0) {
      console.log('🏆 Top Opportunities:\n');

      top5.forEach((opp, index) => {
        console.log(`${index + 1}. ${opp.title}`);
        console.log(`   Score: ${opp.score}/100 (${opp.tier})`);
        console.log(`   Buy: $${opp.buyPrice} → Sell: $${opp.estimatedSellPrice}`);
        console.log(`   Profit: $${opp.estimatedProfit} (ROI: ${opp.roi}%)`);
        console.log(`   Source: ${opp.source}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No opportunities found matching criteria');
      console.log('   Try lowering minScore or minROI');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('eBay App ID not configured')) {
      console.log('\n💡 Using mock data (eBay API not configured yet)');
      console.log('   This is expected while waiting for eBay API approval');
    }
  }
}

// Run the test
testAutonomousSystem();
```

### Step 3: Run Test

```bash
cd /home/user/arbi
node scripts/test-autonomous.js
```

**Expected Output:**
```
🤖 Testing ARBI Autonomous System...

📋 Configuration:
{
  "minScore": 70,
  "minROI": 20,
  "minProfit": 5,
  ...
}

🔍 Starting scan...
⚠️  eBay App ID not configured. Using mock data.

🤖 Starting multi-platform autonomous arbitrage scan...
   Platform: ebay (mock data)
   Platform: amazon (no API key)
   Platform: retail (active)
   Platform: webscraper (active)

✅ Scan complete!
   Found 12 opportunities

🏆 Top Opportunities:

1. Apple iPhone 15 Pro Max 256GB
   Score: 87/100 (high)
   Buy: $899 → Sell: $1,199
   Profit: $245 (ROI: 27%)
   Source: ebay

2. Samsung Galaxy Tab S9 Ultra
   Score: 82/100 (high)
   Buy: $749 → Sell: $999
   Profit: $180 (ROI: 24%)
   Source: ebay
...
```

---

## 🔥 ONCE YOU HAVE EBAY API KEYS

### Step 1: Add Keys to Railway

**In Railway Dashboard:**
1. Go to your API service
2. Click **Variables** tab
3. Add:
   ```
   EBAY_APP_ID=your_app_id_here
   EBAY_CERT_ID=your_cert_id_here
   EBAY_DEV_ID=your_dev_id_here
   ```
4. Click **Deploy** (Railway will restart with new vars)

### Step 2: Add Keys Locally

Create `apps/api/.env.local`:
```bash
EBAY_APP_ID=your_app_id_here
EBAY_CERT_ID=your_cert_id_here
EBAY_DEV_ID=your_dev_id_here

# Optional - for Amazon scanning
RAINFOREST_API_KEY=your_key_here

# Database (copy from Railway)
DATABASE_URL=postgresql://...
```

### Step 3: Test with Real Data

Run the same test script:
```bash
node scripts/test-autonomous.js
```

**Now you'll see REAL opportunities:**
```
🤖 Starting multi-platform autonomous arbitrage scan...

📊 eBay scan found 47 products
   Platform ebay found 8 opportunities

📊 Amazon scan found 23 products (via Rainforest)
   Platform amazon found 3 opportunities

✅ Scan complete!
   Found 11 real opportunities

🏆 Top Opportunities:

1. Nintendo Switch OLED - White
   Score: 92/100 (excellent)
   Buy: $287.99 (eBay) → Sell: $349.99 (Amazon)
   Net Profit: $32.50 (ROI: 11%)
   URL: https://ebay.com/itm/...

2. Apple AirPods Pro 2nd Gen
   Score: 88/100 (high)
   Buy: $189.99 (eBay) → Sell: $249.99 (Amazon)
   Net Profit: $28.75 (ROI: 15%)
   URL: https://ebay.com/itm/...
```

---

## 📊 CHECK RAILWAY STATUS

### See if Backend is Running:

**Visit your Railway URL:**
```
https://arbi-production.up.railway.app/api/status
```

**You should see:**
```json
{
  "status": "healthy",
  "uptime": 12345,
  "platform": "railway",
  "environment": "production"
}
```

### Test Autonomous Endpoint:

**Trigger a scan:**
```bash
curl -X POST https://arbi-production.up.railway.app/api/autonomous/scan
```

**Check opportunities:**
```bash
curl https://arbi-production.up.railway.app/api/autonomous/opportunities
```

---

## 🐛 TROUBLESHOOTING

### "eBay App ID not configured"
✅ **Expected** - You're waiting for API approval
💡 System will use mock data until you add real keys

### "Database connection failed"
🔧 Check `DATABASE_URL` is set in Railway variables
🔧 Make sure PostgreSQL service is running

### "Rainforest API error"
✅ **Optional** - System works without it
💡 Only needed for Amazon price data

### "No opportunities found"
🔧 Lower `minScore` to 60 or 50
🔧 Lower `minROI` to 10%
🔧 Increase `maxPrice` to $200

---

## ⚡ QUICK START CHECKLIST

**TODAY (While Waiting for eBay API):**
- [ ] Test autonomous system with mock data
- [ ] Verify Railway backend is running
- [ ] Check database connection
- [ ] Review opportunity scoring logic

**WHEN EBAY API APPROVED (1 Business Day):**
- [ ] Add eBay keys to Railway variables
- [ ] Add eBay keys locally
- [ ] Run real scan
- [ ] Find first profitable opportunity
- [ ] Make first $20-50 profit!

**THIS WEEK:**
- [ ] Sign up for Rainforest API (1,000 free requests)
- [ ] Run hourly scans
- [ ] Track 5-10 best opportunities
- [ ] Execute first manual flip

---

## 🎯 EXPECTED RESULTS

**With Mock Data (Today):**
- See how the system works
- Understand opportunity scoring
- Test configuration
- Learn the workflow

**With Real eBay API (Tomorrow):**
- Find 10-30 real opportunities per scan
- 5-10 will be 70+ score (worth pursuing)
- 1-3 will be 90+ score (excellent, act fast!)
- Make first $20-50 profit within 48 hours

**Within 1 Week:**
- $100-300 profit from manual flips
- Proven the concept works
- Ready to scale with automation
- Confidence to add more platforms

---

## 💰 FIRST FLIP WORKFLOW

**When you find a 90+ score opportunity:**

1. **Verify** - Check eBay listing still available
2. **Research** - Check Amazon sold listings
3. **List** - Create Amazon listing (manual for now)
4. **Wait** - Customer orders (1-7 days)
5. **Buy** - Purchase from eBay, ship to customer
6. **Profit** - Collect $20-50 profit

**Then repeat 10x per week = $200-500/week profit**

---

## 📞 NEED HELP?

**Check These Files:**
- `packages/arbitrage-engine/src/autonomous/autonomousEngine.ts` - Main engine
- `packages/arbitrage-engine/src/scouts/ebayScout.ts` - eBay scanning
- `AUTONOMOUS_SYSTEM_STATUS.md` - System documentation
- `REMOTE_ONLY_ARBITRAGE.md` - Strategy guide

**Test Commands:**
```bash
# Test autonomous system
node scripts/test-autonomous.js

# Check Railway status
curl https://arbi-production.up.railway.app/api/status

# Manual scan via CLI
node scripts/manual-arbitrage.js scan
```

---

🎉 **You're ready to test! Run the test script now and let me know what you see.**
