# 🚀 ARBI Quick Start Guide - Make Money in 3 Steps

## Prerequisites ✅

You already have:
- ✅ Railway deployment: https://arbi-production.up.railway.app/
- ✅ Stripe configured via MCP
- ✅ Production mode enabled (no mock data)

---

## Step 1: Connect Your Bank Account (5 minutes)

### Option A: Via Stripe Dashboard
1. Go to https://dashboard.stripe.com/
2. Click **"Payouts" → "Bank accounts & debit cards"**
3. Click **"Add bank account"**
4. Enter your bank details:
   - Routing number
   - Account number
   - Account holder name
5. Verify via micro-deposits (2-3 business days)
6. **Copy your Bank Account ID** (starts with `ba_`)

### Option B: Via Stripe MCP (Faster)
Since you have Stripe MCP configured, use it to:
```bash
# Create external account
stripe.accounts.createExternalAccount('acct_xxx', {
  external_account: {
    object: 'bank_account',
    country: 'US',
    currency: 'usd',
    account_holder_name: 'Your Name',
    account_holder_type: 'individual',
    routing_number: 'YOUR_ROUTING',
    account_number: 'YOUR_ACCOUNT'
  }
});
```

**Save your `ba_XXXXXXXXXX` ID - you'll need it next!**

---

## Step 2: Enable Auto-Payouts (1 API call)

Once Railway deploys the latest code, run:

```bash
curl -X POST https://arbi-production.up.railway.app/api/payout/auto-enable \
  -H "Content-Type: application/json" \
  -d '{
    "bankAccountId": "ba_PASTE_YOUR_BANK_ACCOUNT_ID_HERE",
    "minProfitThreshold": 15,
    "payoutSchedule": "immediate"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Automatic payouts enabled",
  "config": {
    "bankAccountId": "ba_xxx",
    "minProfitThreshold": 15,
    "payoutSchedule": "immediate",
    "enabled": true
  }
}
```

---

## Step 3: Enable 24/7 Autonomous Scanning

```bash
curl -X POST https://arbi-production.up.railway.app/api/autonomous/start \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "minScore": 70,
      "minROI": 15,
      "minProfit": 20,
      "scanInterval": 15,
      "autoBuyEnabled": true,
      "autoBuyScore": 85,
      "dailyBudget": 500
    }
  }'
```

**What this does:**
- ✅ Scans for opportunities every 15 minutes
- ✅ Auto-executes trades scoring 85+ (very high confidence)
- ✅ Limits spending to $500/day
- ✅ Only considers deals with $20+ profit and 15%+ ROI
- ✅ Automatically transfers profits to your bank

---

## 🎯 What Happens Next (Automated)

```
Every 15 Minutes:
┌──────────────────────────────────────┐
│  1. System scans for opportunities   │
│     → Web Scraper (Target, Walmart)  │
│     → Rainforest API (Amazon)*       │
│     → eBay API*                      │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  2. AI scores each opportunity       │
│     → Profit potential (0-30 pts)    │
│     → Confidence (0-25 pts)          │
│     → Speed (0-20 pts)               │
│     → Risk (0-15 pts)                │
│     → Volatility (0-10 pts)          │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  3. High-scoring deals auto-execute  │
│     → Buy from source platform       │
│     → List on destination platform   │
│     → Wait for sale                  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  4. Profit auto-transferred to bank  │
│     → Gross profit calculated        │
│     → Platform takes 25%             │
│     → You get 75% minus Stripe fee   │
│     → Money in bank 1-2 days         │
└──────────────────────────────────────┘
```

*Requires API keys in Railway environment variables*

---

## 💰 Example: Your First Day

Let's say the system finds and executes 3 trades on Day 1:

### Trade 1: Apple AirPods Pro
```
Buy: $189.99 (Target Clearance)
Sell: $249.99 (eBay)
Profit: $60.00
Your cut (75%): $45.00
Stripe fee: -$1.61
To your bank: $43.39 ✅
```

### Trade 2: LEGO Millennium Falcon
```
Buy: $139.99 (Walmart)
Sell: $189.99 (Amazon)
Profit: $50.00
Your cut (75%): $37.50
Stripe fee: -$1.39
To your bank: $36.11 ✅
```

### Trade 3: Dyson Vacuum
```
Buy: $249.99 (Best Buy Open Box)
Sell: $329.99 (Amazon FBA)
Profit: $80.00
Your cut (75%): $60.00
Stripe fee: -$2.04
To your bank: $57.96 ✅
```

**Day 1 Total to Your Bank: $137.46** 💰

**Week 1 Projection (3 trades/day): ~$962**
**Month 1 Projection: ~$4,124**

---

## 📊 Monitoring Your System

### Check Status
```bash
# System health
curl https://arbi-production.up.railway.app/api/arbitrage/health

# Autonomous status
curl https://arbi-production.up.railway.app/api/autonomous/status

# Payout history
curl https://arbi-production.up.railway.app/api/payout/history
```

### View Live Opportunities
```bash
curl https://arbi-production.up.railway.app/api/arbitrage/opportunities?minProfit=20
```

### Manual Trade Execution
```bash
curl -X POST https://arbi-production.up.railway.app/api/payout/execute \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "OPPORTUNITY_ID",
    "buyPrice": 199.99,
    "sellPrice": 299.99,
    "productTitle": "Product Name"
  }'
```

---

## 🔒 Safety Features

### Budget Limits
- **Daily**: $500 (configurable)
- **Per Trade**: $400 max
- **Monthly**: $10,000 max
- **Reserve Fund**: $1,000 emergency buffer

### Risk Management
- Only executes trades scoring 85+ (when auto-buy enabled)
- Confidence threshold: 70%+
- ROI requirement: 15%+
- Profit minimum: $20+

### Automatic Stops
System automatically pauses if:
- Daily budget reached
- Monthly limit hit
- 3 consecutive failed trades
- Bank account verification fails

---

## 🚀 Railway Deployment

### Trigger Manual Deploy:
1. Go to https://railway.app/project/3a3aebde-65aa-4d80-9496-4bb1e10321c1
2. Click your API service
3. Go to **"Deployments"** tab
4. Click **"Redeploy"**
5. Wait 2-3 minutes

### Required Environment Variables:
```
# Optional but recommended for more data:
RAINFOREST_API_KEY=your_key_here    # Amazon data ($49/mo, 1000 free requests)
EBAY_APP_ID=your_key_here           # eBay data (free)

# Already configured:
# - Stripe via MCP
# - Web Scraper (always enabled)
```

### Verify Deployment:
```bash
curl https://arbi-production.up.railway.app/api/arbitrage/health

# Should show:
{
  "mode": "production",
  "mockDataEnabled": false,
  "scouts": [
    "Rainforest Scout (Amazon - Real API)",  // if key set
    "Web Scraper (Playwright/Puppeteer - Real Data)"
  ]
}
```

---

## 📞 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/arbitrage/health` | GET | System status |
| `/api/arbitrage/opportunities` | GET | Find deals |
| `/api/payout/execute` | POST | Execute trade + payout |
| `/api/payout/history` | GET | View earnings |
| `/api/payout/auto-enable` | POST | Enable auto-transfers |
| `/api/autonomous/start` | POST | Start 24/7 scanning |
| `/api/autonomous/status` | GET | Check autonomous system |
| `/api/autonomous/stop` | POST | Pause automation |

---

## ⚡ Quick Test (After Railway Deploys)

```bash
# 1. Check system
curl https://arbi-production.up.railway.app/api/arbitrage/health

# 2. Find opportunities
curl https://arbi-production.up.railway.app/api/arbitrage/opportunities?minProfit=15

# 3. Execute first trade manually
curl -X POST https://arbi-production.up.railway.app/api/payout/execute \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "test-001",
    "buyPrice": 100,
    "sellPrice": 150,
    "productTitle": "Test Product"
  }'

# Expected: $37.50 profit to your bank
```

---

## 🎯 You're Ready!

**System Status:**
- ✅ Code deployed to GitHub
- ✅ Production mode enabled (no mock data)
- ✅ Payout system built
- ✅ Autonomous scanning ready
- ⏳ Railway deployment pending (manual trigger needed)

**Next Action:**
1. Trigger Railway redeploy (link above)
2. Wait 3 minutes
3. Connect Stripe bank account
4. Enable auto-payouts
5. Start autonomous scanning
6. **Watch money flow into your account** 💰

---

*Your automated arbitrage money machine is ready to run!* 🚀
