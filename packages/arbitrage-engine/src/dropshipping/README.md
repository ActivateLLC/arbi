# Dropshipping Module - Quick Reference

## Complete Zero-Capital Arbitrage System

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   ZERO-CAPITAL WORKFLOW                     │
└─────────────────────────────────────────────────────────────┘

1. DISCOVERY
   ┌──────────────┐
   │ Scout finds: │ eBay iPhone for $280
   │ eBay listing │ Amazon selling for $380
   └──────────────┘ Potential profit: $60
          │
          ▼
2. EXTRACTION
   ┌─────────────────────┐
   │ PhotoExtraction    │ → Downloads 8 product images
   │ Service            │ → Extracts title, description, specs
   └─────────────────────┘ → Uploads to Cloudinary CDN
          │
          ▼
3. LISTING (NO PURCHASE YET!)
   ┌─────────────────────┐
   │ EbaySellerAPI /    │ → Creates Amazon listing at $379
   │ AmazonSellerAPI    │ → Uses CDN-hosted images
   └─────────────────────┘ → Sets quantity to 1
          │
          ▼
4. MONITORING
   ┌─────────────────────┐
   │ AvailabilityMonitor│ → Checks eBay every 15 minutes
   │ (every 15 min)     │ → If sold out → End Amazon listing
   └─────────────────────┘ → If price up → Adjust or end
          │
          ▼
5. CUSTOMER ORDERS (🎉 Money received!)
   ┌─────────────────────┐
   │ Webhook receives   │ → Customer paid $379
   │ Amazon order       │ → Extract shipping address
   └─────────────────────┘ → Trigger fulfillment
          │
          ▼
6. FULFILLMENT (NOW we buy!)
   ┌─────────────────────┐
   │ OrderFulfillment   │ → Purchase from eBay for $280
   │ Service            │ → Use customer's address as shipping
   └─────────────────────┘ → Get tracking number
          │
          ▼
7. DELIVERY
   ┌─────────────────────┐
   │ eBay seller ships  │ → Direct to Amazon customer
   │ directly to        │ → Update Amazon order with tracking
   │ Amazon customer    │ → Customer receives product
   └─────────────────────┘
          │
          ▼
8. PROFIT! 💰
   ┌─────────────────────┐
   │ Revenue:    $379   │
   │ Cost:       $280   │
   │ Amazon fee: $57    │
   │ Payment:    $11    │
   │ ─────────────────  │
   │ NET PROFIT: $31    │
   └─────────────────────┘

   CAPITAL INVESTED: $0
   (Bought AFTER customer paid!)
```

---

## 📁 File Structure

```
packages/arbitrage-engine/src/
├── dropshipping/
│   ├── DropshippingEngine.ts       # Main orchestrator
│   └── README.md                    # This file
├── services/
│   ├── ImageHostingService.ts       # Cloudinary upload
│   ├── PhotoExtractionService.ts   # Extract from eBay/Amazon/Walmart
│   ├── AvailabilityMonitor.ts      # Check if source in stock
│   └── OrderFulfillmentService.ts  # Auto-purchase from source
├── platforms/
│   ├── EbaySellerAPI.ts            # Create eBay listings
│   └── AmazonSellerAPI.ts          # Create Amazon listings
└── db/
    └── schema/
        └── dropshipping.prisma     # Database tables

apps/api/src/
└── routes/
    └── dropshipping-webhooks.ts    # Receive order notifications
```

---

## 🚀 Usage Examples

### Example 1: Extract Product & Upload Photos

```typescript
import { PhotoExtractionService } from '../services/PhotoExtractionService';

const extractor = new PhotoExtractionService();

// Extract from eBay
const product = await extractor.extractProductData(
  'https://www.ebay.com/itm/123456789'
);

console.log(product);
// {
//   title: "Apple iPhone 15 Pro Max 256GB Natural Titanium",
//   description: "Brand new, sealed in box...",
//   images: [
//     {
//       originalUrl: "https://i.ebayimg.com/...",
//       hostedUrl: "https://res.cloudinary.com/arbi/...",
//       publicId: "arbi/ebay/abc123",
//       width: 1600,
//       height: 1600
//     },
//     // ... more images
//   ],
//   condition: "new",
//   upc: "195949034527",
//   brand: "Apple",
//   platform: "ebay"
// }
```

### Example 2: Create Listing on eBay

```typescript
import { EbaySellerAPI } from '../platforms/EbaySellerAPI';

const ebay = new EbaySellerAPI(process.env.EBAY_SELLER_ACCESS_TOKEN);

const result = await ebay.createListing({
  productData: product,
  price: 379.99,
  quantity: 1,
  listingDuration: 'GTC', // Good 'Til Cancelled
  categoryId: '9355' // Cell Phones & Smartphones
});

if (result.success) {
  console.log(`✅ Listed on eBay: ${result.listingUrl}`);
  console.log(`   SKU: ${result.sku}`);
  console.log(`   Listing ID: ${result.listingId}`);
}
```

### Example 3: Monitor Availability

```typescript
import { AvailabilityMonitor } from '../services/AvailabilityMonitor';

const monitor = new AvailabilityMonitor();

// Check single item
const check = await monitor.checkAvailability(
  'https://www.ebay.com/itm/123456789',
  280.00 // expected price
);

if (!check.inStock) {
  console.log('❌ Source item sold out!');
  // End destination listing immediately
  await ebay.endListing(listingId, 'OUT_OF_STOCK');
}

if (check.priceChanged) {
  console.log(`⚠️ Price changed from $280 to $${check.price}`);
  // Recalculate profit, decide whether to adjust or end listing
}

// Check multiple listings
const listings = [
  { url: 'https://ebay.com/itm/111', expectedPrice: 50 },
  { url: 'https://ebay.com/itm/222', expectedPrice: 75 },
  { url: 'https://ebay.com/itm/333', expectedPrice: 100 }
];

const results = await monitor.checkMultiple(listings);

// Process results
results.forEach((result, index) => {
  if (!result.inStock) {
    console.log(`Listing ${index + 1} is out of stock`);
  }
});
```

### Example 4: Handle Order (Semi-Automated)

```typescript
import { OrderFulfillmentService } from '../services/OrderFulfillmentService';

const fulfillment = new OrderFulfillmentService();

// When webhook receives order notification
const order = {
  destinationOrderId: 'AMAZON-12345',
  destinationPlatform: 'amazon' as const,
  customerPaid: 379.99,
  customerAddress: {
    name: 'John Smith',
    address1: '123 Main St',
    address2: 'Apt 4B',
    city: 'Seattle',
    state: 'WA',
    zip: '98101',
    country: 'US',
    phone: '206-555-1234'
  },
  sourceUrl: 'https://www.ebay.com/itm/123456789',
  sourcePlatform: 'ebay' as const,
  sourcePrice: 280.00,
  sourceItemId: '123456789',
  dropshippingListingId: 'listing-abc-123'
};

// Option A: Fully automated (requires Puppeteer)
try {
  const result = await fulfillment.fulfillOrder(order);

  if (result.success) {
    console.log(`✅ Order fulfilled automatically!`);
    console.log(`   Source Order: ${result.sourceOrderId}`);
    console.log(`   Tracking: ${result.trackingNumber}`);
  }
} catch (error) {
  console.error('❌ Auto-fulfillment failed, use manual workflow');
}

// Option B: Semi-automated (recommended for MVP)
const instructions = await fulfillment.semiAutomatedFulfillment(order);

console.log('📋 MANUAL FULFILLMENT REQUIRED:');
console.log(instructions.instructions);
console.log(`\nPrepopulated data:`);
console.log(JSON.stringify(instructions.prepopulatedData, null, 2));
```

---

## 🔄 Typical Workflow

### Daily Operations (Manual):

```bash
# Morning: Scan for new opportunities
node scripts/dropshipping-scan.js

# Returns: 15 opportunities found
# 1. eBay $45 → Amazon $85 (ROI: 89%, Profit: $22)
# 2. eBay $62 → Amazon $110 (ROI: 77%, Profit: $28)
# ...

# Create 5-10 listings manually or use:
node scripts/create-listing.js --source "ebay-url" --dest "amazon" --markup 1.7

# Afternoon: Check availability
node scripts/check-availability.js

# Returns: 2 listings out of stock, ended automatically

# Customer orders: Webhook triggers, you get email/SMS
# Manually purchase from source, enter tracking

# Evening: Check stats
node scripts/dropshipping-stats.js

# Returns:
# Active listings: 45
# Orders today: 3
# Profit today: $67
# Monthly profit: $1,234
```

### Daily Operations (Automated):

```bash
# System runs 24/7, you just monitor:

# Morning: Check dashboard
curl https://arbi-production.up.railway.app/api/dropshipping/stats

{
  "activeListings": 150,
  "ordersToday": 8,
  "profitToday": 187.50,
  "profitMonth": 4235.00,
  "outOfStock": 3,
  "pendingFulfillment": 1
}

# If pending fulfillment = 0: All good!
# If pending fulfillment > 0: Review and complete manually
```

---

## ⚙️ Configuration

### Set Monitoring Frequency:

```typescript
// In database or config file:
const config = {
  availabilityCheckInterval: 15, // minutes

  // New listings: check every 10 min
  // Old listings (30+ days): check every 30 min
  dynamicIntervals: true,

  // Alert immediately if out of stock
  alertOnOutOfStock: true,

  // Alert if price increases by more than 10%
  alertOnPriceIncrease: 10,
};
```

### Set Auto-Listing Thresholds:

```typescript
const autoListingConfig = {
  enabled: false, // Start with manual approval
  minROI: 50, // Only auto-list if ROI > 50%
  minProfit: 15, // Only auto-list if profit > $15
  maxSourcePrice: 100, // Don't auto-list items > $100
  requireUPC: true, // Only auto-list if UPC available
};
```

---

## 📊 Database Queries

### Get Active Listings:

```typescript
const activeListings = await prisma.dropshippingListing.findMany({
  where: {
    status: 'listed',
    sourceInStock: true
  },
  include: {
    orders: true
  }
});
```

### Get Orders Pending Fulfillment:

```typescript
const pendingOrders = await prisma.dropshippingOrder.findMany({
  where: {
    status: 'pending'
  },
  include: {
    listing: true
  }
});
```

### Calculate Daily Profit:

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const stats = await prisma.dropshippingOrder.aggregate({
  where: {
    createdAt: {
      gte: today
    },
    status: {
      in: ['source_ordered', 'shipped', 'delivered']
    }
  },
  _sum: {
    customerPaid: true,
    sourcePaid: true
  },
  _count: true
});

const profit = (stats._sum.customerPaid || 0) - (stats._sum.sourcePaid || 0);
console.log(`Today's profit: $${profit.toFixed(2)}`);
```

---

## 🐛 Troubleshooting

### Images Not Uploading:
```bash
# Check Cloudinary credentials
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY

# Test upload
curl -X POST "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload" \
  -F "file=@test.jpg" \
  -F "api_key=$CLOUDINARY_API_KEY"
```

### eBay Listing Fails:
```bash
# Check OAuth token still valid
# eBay tokens expire after 2 hours

# Get new token:
# https://developer.ebay.com/my/auth/?env=production&index=0
```

### Amazon Listing Fails:
```bash
# Check if ASIN exists
# Amazon requires matching existing ASIN or Brand Registry

# Search for ASIN by UPC:
curl "https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items?identifiers=UPC_CODE&identifiersType=UPC"
```

### Webhook Not Receiving Orders:
```bash
# Test webhook endpoint
curl -X POST https://arbi-production.up.railway.app/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return: {"status": "received"}

# Check eBay webhook subscription:
# https://developer.ebay.com/my/subscriptions
```

---

## 📈 Optimization Tips

### 1. Batch Process Photos:
```typescript
// Instead of processing one at a time:
const urls = [...100 eBay URLs...];

// Process 10 at a time:
for (let i = 0; i < urls.length; i += 10) {
  const batch = urls.slice(i, i + 10);
  const products = await Promise.all(
    batch.map(url => extractor.extractProductData(url))
  );
  // Create listings for batch
}
```

### 2. Cache Availability Checks:
```typescript
// Don't check same URL multiple times in 15 min
const cache = new Map<string, { inStock: boolean, checkedAt: Date }>();

async function checkWithCache(url: string) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.checkedAt.getTime() < 15 * 60 * 1000) {
    return cached;
  }

  const result = await monitor.checkAvailability(url);
  cache.set(url, { ...result, checkedAt: new Date() });
  return result;
}
```

### 3. Prioritize High-Value Listings:
```typescript
// Check expensive listings more frequently
const interval = listing.destinationPrice > 200 ? 10 : 15; // minutes
```

---

## 🎯 Success Metrics to Track

```typescript
interface DropshippingMetrics {
  // Listing metrics
  activeListings: number;
  listingsCreated: number;
  listingsEnded: number;

  // Order metrics
  ordersReceived: number;
  ordersFulfilled: number;
  ordersCanceled: number;

  // Financial metrics
  revenue: number;
  costs: number;
  fees: number;
  profit: number;
  avgROI: number;

  // Performance metrics
  conversionRate: number; // orders / listings
  avgDaysToSell: number;
  outOfStockRate: number; // % of listings that went out of stock

  // By platform
  bySource: { ebay: number; amazon: number; walmart: number };
  byDestination: { ebay: number; amazon: number };
}
```

---

## 🚀 Next Steps

1. **Start Manual** - Create 5 test listings today
2. **Setup Cloudinary** - Enable photo automation
3. **Apply for eBay Seller API** - Enable auto-listing
4. **Test Webhooks** - Simulate order fulfillment
5. **Scale Gradually** - 10 → 50 → 100 → 500 listings

**Capital Required: $0**

**Time to First Sale: 1-7 days**

**Time to $1,000/month: 2-4 weeks**

**Time to $10,000/month: 2-4 months**

---

Good luck! 🎉
