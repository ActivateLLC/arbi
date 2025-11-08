# 🚀 5-Minute eBay Setup - Start Finding Real Deals NOW

No Amazon API needed! eBay's API is FREE and takes 5 minutes to set up.

## Step 1: Get Your FREE eBay API Key (2 minutes)

1. Go to **https://developer.ebay.com/join/**
2. Click "Register" and create an account
3. After registration, go to **https://developer.ebay.com/my/keys**
4. Create a new keyset (choose "Production" environment)
5. Copy your **App ID** (looks like: `YourName-YourApp-PRD-1234567890-abcdef12`)

## Step 2: Add to Your .env File (30 seconds)

```bash
# Add this line to /home/user/arbi/.env
EBAY_APP_ID=YourName-YourApp-PRD-1234567890-abcdef12
```

Or run this command:
```bash
echo "EBAY_APP_ID=YOUR_ACTUAL_APP_ID_HERE" >> /home/user/arbi/.env
```

## Step 3: Enable eBay Scout in Your API (2 minutes)

Edit `/home/user/arbi/apps/api/src/routes/arbitrage.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import {
  ArbitrageEngine,
  EbayScout,  // ADD THIS
  type UserBudgetSettings,
  type ScoutConfig
} from '@arbi/arbitrage-engine';

const router = Router();

// Initialize arbitrage engine
const arbitrageEngine = new ArbitrageEngine();

// ADD THIS: Enable eBay scout
if (process.env.EBAY_APP_ID) {
  const ebayScout = new EbayScout(process.env.EBAY_APP_ID);
  arbitrageEngine.registerScout(ebayScout);
  console.log('✅ eBay scout enabled - finding underpriced listings');
} else {
  console.log('⚠️  EBAY_APP_ID not set - eBay scout disabled');
}

// Rest of your code stays the same...
```

## Step 4: Rebuild and Restart (1 minute)

```bash
cd /home/user/arbi

# Rebuild packages
pnpm --filter @arbi/arbitrage-engine build
pnpm --filter @arbi/api build

# Restart server
cd apps/api
node dist/index.js
```

## Step 5: Test It! (30 seconds)

```bash
# Get real opportunities from eBay
curl http://localhost:3000/api/arbitrage/opportunities

# Or with prettier output:
curl -s http://localhost:3000/api/arbitrage/opportunities | jq '.opportunities[] | {title: .opportunity.title, profit: .opportunity.estimatedProfit, roi: .opportunity.roi}'
```

## What You'll Get

The eBay scout finds items that are:
- ✅ Listed BELOW their average sold price
- ✅ New condition, Buy It Now listings
- ✅ Ready to purchase and relist at profit

**Example opportunities:**
```
iPhone 15 Pro
  Listed at: $899 (20% below average)
  Average sold price: $1,125
  Potential profit: $165 after fees
  ROI: 18.4%

Sony WH-1000XM5 Headphones
  Listed at: $299
  Average sold price: $380
  Potential profit: $42
  ROI: 14%
```

## How It Works

1. **Searches eBay** for active Buy It Now listings
2. **Gets average sold price** from completed listings (last 30 days)
3. **Finds underpriced items** (>20% below average sold price)
4. **Calculates real profit** after eBay fees (13%) and shipping
5. **Returns recommendations** sorted by profit potential

## Limitations & Tips

**Free Tier Limits:**
- 5,000 API calls per day
- That's ~200 opportunities scanned per hour
- More than enough for starting out!

**Tips for Better Results:**
- Search specific categories (electronics, collectibles)
- Focus on high-demand items ($100-500 range)
- Check listings multiple times per day
- Act fast - good deals get snatched quickly!

**Rate Limiting:**
- The scout automatically delays 500ms between requests
- Stays well within eBay's limits
- No risk of being blocked

## Upgrade Options

**Want even more opportunities?**

Add web scraping (FREE):
```typescript
import { WebScraperScout } from '@arbi/arbitrage-engine';
arbitrageEngine.registerScout(new WebScraperScout());
```

Add Rainforest API for Amazon data ($49/mo):
```typescript
import { RainforestScout } from '@arbi/arbitrage-engine';
if (process.env.RAINFOREST_API_KEY) {
  arbitrageEngine.registerScout(new RainforestScout(process.env.RAINFOREST_API_KEY));
}
```

## Troubleshooting

**"No opportunities found"**
- Check your EBAY_APP_ID is correct in .env
- Make sure you used Production key (not Sandbox)
- Try lowering minProfit: `?minProfit=5&minROI=5`

**"API error 401"**
- Your App ID might be incorrect
- Verify it's activated on eBay's developer portal
- Try regenerating the keyset

**"Server won't start"**
- Make sure you rebuilt after changes: `pnpm build`
- Check .env file has no extra spaces
- Verify imports are correct

## Next Steps

Once you're finding opportunities:

1. **Manual validation** - Check the listings yourself first
2. **Purchase test items** - Verify profit calculations
3. **Automate purchases** - Connect payment processor
4. **Scale up** - Add more scouts, categories, automation

## Support

Full documentation: `/home/user/arbi/AMAZON_API_ALTERNATIVES.md`

Questions? The scouts are production-ready and tested!

---

**You're now finding REAL arbitrage opportunities without Amazon API!** 🎉
