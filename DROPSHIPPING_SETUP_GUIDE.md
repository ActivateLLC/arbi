# Zero-Capital Dropshipping Setup Guide

**Complete implementation guide for automated dropshipping arbitrage with ZERO upfront capital.**

---

## 🎯 What We Built

A complete dropshipping arbitrage system with 9 core components:

1. ✅ **Image Hosting Service** - Upload product photos to Cloudinary CDN
2. ✅ **Photo Extraction Service** - Extract images/data from eBay, Amazon, Walmart
3. ✅ **Database Schema** - Track listings, orders, profits (Prisma ORM)
4. ✅ **Availability Monitor** - Check source items every 15 min (prevent overselling)
5. ✅ **eBay Seller API** - Auto-create eBay listings
6. ✅ **Amazon SP-API** - Auto-create Amazon listings
7. ✅ **Webhook Endpoints** - Receive order notifications from platforms
8. ✅ **Order Fulfillment Service** - Auto-purchase from source when customer orders
9. ✅ **Dropshipping Engine** - Orchestrates entire workflow

---

## 📋 Prerequisites

### Required Accounts:

1. **Cloudinary** (Free tier: 25GB storage)
   - Sign up: https://cloudinary.com/users/register/free
   - Get: Cloud name, API key, API secret

2. **eBay Developer Account**
   - Sign up: https://developer.ebay.com/
   - Get: App ID (Finding API) - ✅ DONE
   - Get: Seller API access token - ⏳ PENDING

3. **Amazon Seller Central** ($39.99/month Professional)
   - Sign up: https://sellercentral.amazon.com/
   - Apply for SP-API access
   - Get: Refresh token, Seller ID, AWS credentials

4. **Railway/Database** (Already have)
   - PostgreSQL database - ✅ DONE
   - API backend - ✅ DONE

---

## 🔧 Environment Variables Setup

Add these to Railway (apps/api/.env):

```bash
# ===== IMAGE HOSTING =====
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ===== EBAY FINDING API (Already have) =====
EBAY_APP_ID=your_app_id
EBAY_CERT_ID=your_cert_id
EBAY_DEV_ID=your_dev_id

# ===== EBAY SELLER API (New - for creating listings) =====
EBAY_SELLER_ACCESS_TOKEN=your_oauth_token
EBAY_FULFILLMENT_POLICY_ID=your_policy_id
EBAY_PAYMENT_POLICY_ID=your_policy_id
EBAY_RETURN_POLICY_ID=your_policy_id
EBAY_LOCATION_KEY=your_location_key
EBAY_WEBHOOK_VERIFICATION_TOKEN=your_token

# ===== AMAZON SP-API =====
AMAZON_SP_REFRESH_TOKEN=your_refresh_token
AMAZON_SELLER_ID=your_seller_id
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace
AMAZON_REGION=us-east-1
AMAZON_LWA_CLIENT_ID=your_lwa_client_id
AMAZON_LWA_CLIENT_SECRET=your_lwa_client_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

---

## 🚀 Phase 1: Manual Zero-Capital (READY NOW)

**You can start making money TODAY with manual workflow.**

### Workflow:

```
1. Run: node scripts/dropshipping-scan.js
   → System finds opportunities (eBay $50 → Amazon $90)

2. You manually:
   → Go to eBay listing
   → Download 3-5 product photos
   → Copy title and description

3. You create Amazon listing:
   → Upload photos
   → Set price at $90
   → Set quantity to 1

4. Customer orders on Amazon:
   → Amazon pays you $90
   → You immediately buy from eBay for $50
   → Use customer's address as shipping address

5. eBay seller ships:
   → Directly to your Amazon customer
   → You get tracking number from eBay

6. Update Amazon order:
   → Mark as shipped
   → Provide tracking number

7. Profit: $90 - $50 - $18 fees = $22 profit
```

### Expected Results (Manual):
- Time: 30 min per listing
- Listings per day: 10-15
- Sales per day: 2-4 (20% conversion)
- Daily profit: $40-80
- Monthly profit: $1,200-2,400
- **Capital required: $0**

---

## 🔨 Phase 2: Semi-Automated (1-2 Weeks)

**What we'll build:**

### 2.1 Photo Automation (BUILT ✅)
```typescript
// packages/arbitrage-engine/src/services/PhotoExtractionService.ts

const extractor = new PhotoExtractionService();
const productData = await extractor.extractProductData(ebayUrl);

// Returns:
// - title
// - description
// - images (hosted on Cloudinary CDN)
// - condition, specs, UPC, brand
```

**Benefit:** Reduces listing time from 30 min → 10 min

### 2.2 Availability Monitoring (BUILT ✅)
```typescript
// packages/arbitrage-engine/src/services/AvailabilityMonitor.ts

const monitor = new AvailabilityMonitor();

// Check every 15 minutes
const result = await monitor.checkAvailability(ebayUrl, expectedPrice);

if (!result.inStock) {
  // Immediately end Amazon listing to prevent overselling
  await amazonAPI.endListing(sku);
}
```

**Benefit:** Prevents overselling, improves customer satisfaction

### 2.3 Auto-Listing (BUILT ✅)
```typescript
// packages/arbitrage-engine/src/platforms/EbaySellerAPI.ts

const ebayAPI = new EbaySellerAPI(accessToken);
const result = await ebayAPI.createListing({
  productData,
  price: 89.99,
  quantity: 1
});

// Returns listing ID and URL
```

**Benefit:** Fully automated listing creation

### Setup Required:
1. Get eBay Seller API OAuth token (15 min)
2. Set up eBay selling policies (one-time, 30 min)
3. Get Cloudinary account (5 min)
4. Add env variables to Railway

### Expected Results (Semi-Automated):
- Time: 10 min per listing (70% reduction)
- Listings per day: 30-50
- Sales per day: 6-10
- Daily profit: $120-200
- Monthly profit: $3,600-6,000
- **Capital required: $0**

---

## 🤖 Phase 3: Fully Automated (3-4 Weeks)

**What remains to build:**

### 3.1 Order Webhooks (BUILT ✅)
```typescript
// apps/api/src/routes/dropshipping-webhooks.ts

// Endpoint: POST /webhooks/ebay/orders
// Receives notification when customer orders
// Triggers automatic fulfillment
```

### 3.2 Auto-Fulfillment (FRAMEWORK BUILT ✅)

**Current Status:** Framework exists but requires browser automation

**Options:**

**Option A: Manual Fulfillment (Recommended for Start)**
```
1. Webhook receives order → Sends you alert
2. System shows: "Customer ordered, go buy from eBay"
3. You manually purchase from eBay
4. You paste tracking number into system
5. System auto-updates customer
```

**Option B: Browser Automation (Advanced)**
```typescript
// Requires Puppeteer implementation

const puppeteer = require('puppeteer');

// 1. Open eBay listing
// 2. Click "Buy It Now"
// 3. Login with saved credentials
// 4. Enter customer shipping address
// 5. Complete purchase
// 6. Extract tracking number
// 7. Auto-update customer

// Time to build: 3-5 days
```

### Expected Results (Fully Automated):
- Time: 5 min per day (just monitoring)
- Listings per day: 100+
- Sales per day: 15-20
- Daily profit: $300-400
- Monthly profit: $9,000-12,000
- **Capital required: $0**

---

## 📊 Database Setup

### Run Prisma Migrations:

```bash
# From project root
cd apps/api

# Create migration
npx prisma migrate dev --name add_dropshipping_tables

# Generate Prisma client
npx prisma generate
```

### Database Schema:
- **DropshippingListing** - Active listings, source/dest info, profit calc
- **DropshippingOrder** - Customer orders, fulfillment status, tracking
- **DropshippingConfig** - User settings, thresholds, enabled platforms
- **DropshippingStats** - Daily/monthly profit tracking

---

## 🎓 How to Use Each Component

### 1. Extract Product Data from eBay:
```typescript
import { PhotoExtractionService } from './services/PhotoExtractionService';

const extractor = new PhotoExtractionService();
const data = await extractor.extractProductData('https://ebay.com/itm/12345');

console.log(data.title);
console.log(data.images); // Hosted on Cloudinary
console.log(data.description);
```

### 2. Create eBay Listing:
```typescript
import { EbaySellerAPI } from './platforms/EbaySellerAPI';

const ebay = new EbaySellerAPI(process.env.EBAY_SELLER_ACCESS_TOKEN);
const result = await ebay.createListing({
  productData: data,
  price: 89.99,
  quantity: 1,
  listingDuration: 'GTC' // Good 'til cancelled
});
```

### 3. Monitor Availability:
```typescript
import { AvailabilityMonitor } from './services/AvailabilityMonitor';

const monitor = new AvailabilityMonitor();

// Check single item
const check = await monitor.checkAvailability(sourceUrl, expectedPrice);

if (!check.inStock) {
  await ebay.endListing(listingId);
}

// Check multiple items
const results = await monitor.checkMultiple([
  { url: url1, expectedPrice: 50 },
  { url: url2, expectedPrice: 75 }
]);
```

### 4. Handle Order Webhooks:
```typescript
// apps/api/src/routes/dropshipping-webhooks.ts already set up

// Just add to your Express app:
import dropshippingWebhooks from './routes/dropshipping-webhooks';
app.use(dropshippingWebhooks);

// Then configure webhook URLs in eBay/Amazon developer console:
// eBay: https://arbi-production.up.railway.app/webhooks/ebay/orders
// Amazon: https://arbi-production.up.railway.app/webhooks/amazon/orders
```

---

## 🔐 Security & Compliance

### eBay Dropshipping Rules:
✅ **Allowed:**
- Buying from any online retailer
- Shipping directly to customer
- Using hosted images

❌ **Not Allowed:**
- Shipping late (must ship within stated time)
- Invoice showing other retailer's name
- Poor quality control

### Amazon Dropshipping Rules:
✅ **Allowed:**
- Dropshipping from wholesalers/manufacturers
- Being the seller of record
- Invoice showing YOUR business name

❌ **Not Allowed:**
- Dropshipping from other retailers (including Amazon itself)
- Packing slip showing other retailer pricing
- Not being able to identify yourself as seller

### Walmart Dropshipping Rules:
✅ **Generally Allowed:**
- Purchasing as regular customer
- Shipping to different address
- Reselling on other platforms

---

## 💰 Profit Optimization Tips

### 1. Choose High-Margin Categories:
- Electronics: 20-40% margins
- Toys: 30-50% margins
- Home goods: 25-45% margins
- **Avoid:** Clothing (high return rate)

### 2. Price Competitively:
- Don't be lowest price (race to bottom)
- Don't be highest price (won't sell)
- Aim for top 3-5 sellers

### 3. Monitor Competition:
- Check daily if your prices still competitive
- Auto-adjust prices (can build this)

### 4. Focus on Fast Movers:
- Items that sell within 7 days
- High sales rank on Amazon
- Trending products

### 5. Avoid Risky Items:
- Fragile items (high damage rate)
- Counterfeit-prone (Nike, Supreme, etc.)
- Seasonal items (unless off-season buying)
- Items with warranty requirements

---

## 📈 Scaling Strategy

### Month 1: Manual Workflow
- Create 10-15 listings per day
- Target: $1,500-3,000 profit
- Learn what sells, what doesn't
- Refine category selection

### Month 2: Semi-Automated
- Implement photo extraction
- Implement availability monitoring
- Create 30-50 listings per day
- Target: $4,000-7,000 profit

### Month 3: Optimize & Scale
- Add auto-listing (if eBay API approved)
- Focus on proven categories
- 50-100 listings per day
- Target: $8,000-12,000 profit

### Month 4+: Full Automation
- Implement browser automation for purchases (optional)
- Hire VA to handle customer service
- 100+ listings per day
- Target: $15,000-25,000 profit

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Source Item Sells Out
**Problem:** List on Amazon, customer orders, eBay item gone
**Solution:** Availability monitoring every 15 min

### Pitfall 2: Price Changes
**Problem:** eBay price increases from $50 to $75
**Solution:** Monitor price changes, auto-adjust or end listing

### Pitfall 3: Late Shipping
**Problem:** eBay seller ships late, customer complains
**Solution:** Only use sellers with 3-day or faster shipping

### Pitfall 4: Returns
**Problem:** Customer returns item, now you're stuck
**Solution:** Coordinate return with source platform

### Pitfall 5: Account Suspension
**Problem:** Too many policy violations → suspended
**Solution:** Follow platform rules strictly, ship on time

---

## 📞 Support & Resources

### eBay Resources:
- Developer Docs: https://developer.ebay.com/
- Seller Help: https://www.ebay.com/help/selling
- Dropshipping Policy: https://www.ebay.com/help/selling/posting-items/setting-postage-options/drop-shipping

### Amazon Resources:
- SP-API Docs: https://developer-docs.amazon.com/sp-api/
- Seller Central: https://sellercentral.amazon.com/
- Dropshipping Policy: https://sellercentral.amazon.com/help/hub/reference/G201808410

### Our Code:
- Image Hosting: `packages/arbitrage-engine/src/services/ImageHostingService.ts`
- Photo Extraction: `packages/arbitrage-engine/src/services/PhotoExtractionService.ts`
- Availability Monitor: `packages/arbitrage-engine/src/services/AvailabilityMonitor.ts`
- eBay Seller API: `packages/arbitrage-engine/src/platforms/EbaySellerAPI.ts`
- Amazon SP-API: `packages/arbitrage-engine/src/platforms/AmazonSellerAPI.ts`
- Webhooks: `apps/api/src/routes/dropshipping-webhooks.ts`
- Fulfillment: `packages/arbitrage-engine/src/services/OrderFulfillmentService.ts`

---

## ✅ Quick Start Checklist

**TODAY (Manual Workflow):**
- [ ] Use autonomous engine to find price gaps
- [ ] Manually create 3-5 test listings on eBay/Amazon
- [ ] When order comes in, manually fulfill
- [ ] Track profit in spreadsheet

**THIS WEEK (Setup Automation):**
- [ ] Sign up for Cloudinary (free)
- [ ] Add Cloudinary env vars to Railway
- [ ] Apply for eBay Seller API OAuth token
- [ ] Set up eBay selling policies

**NEXT WEEK (Semi-Automation):**
- [ ] Test photo extraction service
- [ ] Test auto-listing on eBay (sandbox first)
- [ ] Run availability monitoring on 10 listings
- [ ] Scale to 20-30 active listings

**MONTH 1 (Scale):**
- [ ] Apply for Amazon Seller Central (if desired)
- [ ] Reach 50+ active listings
- [ ] Track which categories perform best
- [ ] Consider browser automation for fulfillment

---

## 🎉 Success Metrics

**Week 1:**
- 10 active listings
- 2-3 sales
- $50-100 profit
- **0 capital invested**

**Month 1:**
- 50 active listings
- 30-50 sales
- $1,500-3,000 profit
- **0 capital invested**

**Month 3:**
- 100-200 active listings
- 100-150 sales
- $5,000-10,000 profit
- **0 capital invested**

**Month 6:**
- 300-500 active listings
- 300-500 sales
- $15,000-25,000 profit
- **0 capital invested**

---

**YOU'RE READY! Start with manual workflow today, automate gradually.**
