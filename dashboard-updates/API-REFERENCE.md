# 📋 Arbi API - Complete Endpoint Reference

**Base URL:** `https://api.arbi.creai.dev`

---

## 🏥 Health & Debug

```bash
GET  /health                    # Server health check
GET  /debug/config              # Verify API keys configured (no values exposed)
```

**Example:**
```bash
curl https://api.arbi.creai.dev/health
# → {"status":"ok","timestamp":"2026-01-04T12:00:00Z"}
```

---

## 🛍️ Marketplace (Zero-Capital Dropshipping)

**Main endpoints - what your dashboard uses:**

```bash
POST   /api/marketplace/list              # Create new listing
GET    /api/marketplace/listings          # Get all listings ⭐ DASHBOARD USES THIS
DELETE /api/marketplace/listings/:id      # Delete listing
POST   /api/marketplace/checkout          # Buyer checkout (Stripe)
GET    /api/marketplace/orders            # Order history
GET    /api/marketplace/health            # Marketplace status
```

**Response Example - GET /api/marketplace/listings:**
```json
{
  "success": true,
  "listings": [
    {
      "listingId": "listing_1766360580855_24nluy3za",
      "productTitle": "Sony Alpha A7 IV Mirrorless Camera",
      "productDescription": "Professional full-frame camera...",
      "productPrice": 2498.00,
      "supplierCost": 1748.60,
      "profitMargin": 749.40,
      "supplierUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
      "productImages": [
        "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360580/..."
      ],
      "isActive": true,
      "createdAt": "2025-12-21T19:43:00.855Z"
    }
  ]
}
```

---

## 📸 Product Images

**Scrape images from Amazon and upload to Cloudinary:**

```bash
POST /api/scrape-rainforest/:listingId    # Rainforest API (premium, bypasses Amazon bot detection)
POST /api/scrape-amazon-buddy/:listingId  # amazon-buddy NPM (open source)
POST /api/scrape-images-simple/:listingId # HTTP + Cheerio scraper
POST /api/scrape-images/:listingId        # Stagehand browser automation
POST /api/fetch-images/:listingId         # Generic image fetcher
POST /api/cleanup-placeholders/:listingId # Remove placeholder images
```

**Example:**
```bash
curl -X POST https://api.arbi.creai.dev/api/scrape-rainforest/listing_1766360580855_24nluy3za
# → {"success":true,"imagesUploaded":5,"images":["https://res.cloudinary.com/..."]}
```

---

## 🎯 Google Ads Campaigns

```bash
POST /api/campaigns/launch               # Launch ads for all products
POST /api/campaigns/launch/:listingId    # Launch ad for specific product
GET  /api/campaigns/status               # Campaign status
GET  /api/campaigns/live                 # Live campaigns
GET  /api/campaigns/info                 # Campaign details
```

**Example:**
```bash
curl -X POST https://api.arbi.creai.dev/api/campaigns/launch/listing_1766360580855_24nluy3za
# → {"success":true,"campaignId":"campaign_123","status":"active"}
```

---

## 🔄 Multi-Supplier Fallback System

**Manage multiple suppliers per product for automatic failover:**

```bash
POST   /api/suppliers                      # Add supplier
POST   /api/suppliers/bulk                 # Add multiple suppliers
GET    /api/suppliers/:listingId           # Get all suppliers for product
GET    /api/suppliers/:listingId/best      # Get best available supplier
PUT    /api/suppliers/:supplierId/stock    # Update stock status
DELETE /api/suppliers/:supplierId          # Remove supplier
POST   /api/suppliers/:listingId/test      # Test supplier availability
POST   /api/suppliers/monitor/start        # Start stock monitoring (every 6 hours)
POST   /api/suppliers/monitor/stop         # Stop monitoring
POST   /api/suppliers/monitor/check        # Manual stock check
GET    /api/suppliers/monitor/status       # Monitor status
```

**Example - Add supplier:**
```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "listing_1766360580855_24nluy3za",
    "supplierName": "Amazon",
    "supplierUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
    "supplierCost": 1748.60,
    "priority": 1,
    "isAvailable": true
  }'
```

---

## 🌐 Public Product Pages

**Customer-facing pages (no auth required):**

```bash
GET /product/:listingId        # Product landing page (HTML)
GET /checkout/:listingId       # Direct checkout page
GET /buy/:listingId           # Short URL redirect to checkout
```

**Example:**
```
https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za
→ Beautiful product page with:
  - Multiple images (gallery)
  - Product description
  - Price + "Buy Now" button
  - Stripe checkout integration
```

---

## 📜 Compliance Pages (Required for Google Ads)

```bash
GET /privacy        # Privacy policy
GET /terms          # Terms of service
GET /refund         # Refund policy
GET /contact        # Contact page
```

---

## ✅ Validation & Testing

```bash
POST /api/validate/products              # Validate products before ads
POST /api/backfill/campaigns             # Create campaigns for existing listings
POST /api/reddit/post                    # Post to Reddit
```

---

## 🤖 AI & Automation (Advanced)

```bash
# AI Engine
POST /api/ai/completion                  # OpenAI completion
POST /api/ai/orchestrate                 # Multi-agent orchestration

# Web Automation
POST   /api/web/session                  # Create browser session
DELETE /api/web/session/:sessionId       # Close session
POST   /api/web/navigate                 # Navigate to URL
GET    /api/web/url                      # Get current URL
POST   /api/web/back                     # Navigate back
POST   /api/web/forward                  # Navigate forward
POST   /api/web/refresh                  # Refresh page

# Voice Interface
GET  /api/voice/health                   # Voice system status

# Payment Processing
POST /api/payment/process                # Process payment (Hyperswitch)
POST /api/payment/refund                 # Process refund

# Arbitrage Discovery
GET  /api/arbitrage/opportunities        # Find arbitrage opportunities
POST /api/arbitrage/evaluate             # Evaluate opportunity
POST /api/arbitrage/execute              # Execute trade
GET  /api/arbitrage/settings             # Get settings
PUT  /api/arbitrage/settings             # Update settings

# Autonomous System
GET  /api/autonomous/opportunities       # Autonomous scanning results
GET  /api/autonomous/stats               # System statistics
POST /api/autonomous-control/start-listing  # Start autonomous job

# Payouts
POST /api/payout/execute                 # Execute trade + bank transfer
GET  /api/payout/history                 # Payout history
POST /api/payout/auto-enable             # Enable autopilot mode

# Revenue Tracking
# (endpoints defined in revenue.ts)

# Webhooks
POST /api/webhooks/stripe                # Stripe payment webhooks
POST /webhooks/dropshipping/amazon/orders  # Amazon order notifications
POST /webhooks/test                      # Test webhook
GET  /webhooks/health                    # Webhook health
```

---

## 🎯 Dashboard Integration

**Your dashboard (`services/arbiService.ts`) uses:**

```typescript
// Primary data source
const response = await fetch('/api/marketplace/listings');
// → Returns all products

// Calculate stats
const stats = {
  totalListings: listings.length,
  activeListings: listings.filter(l => l.isActive).length,
  totalPotentialRevenue: sum(listings.map(l => l.productPrice)),
  totalPotentialProfit: sum(listings.map(l => l.profitMargin)),
  averageMargin: average(listings.map(l => l.profitMargin)),
  topProducts: listings.sort((a,b) => b.profitMargin - a.profitMargin).slice(0, 5)
};
```

**The Vite proxy routes:**
```
Browser: /api/marketplace/listings
         ↓ (Vite proxy)
API: https://api.arbi.creai.dev/api/marketplace/listings
```

No CORS issues! 🎉

---

## 🔐 CORS Configuration

Your API is configured to accept requests from:
```typescript
[
  'https://www.arbi.creai.dev',
  'https://arbi.creai.dev',
  'https://dashboard.arbi.creai.dev',
  'http://localhost:3000',      // Vite dev server
  'http://localhost:5173',      // Alternative Vite port
  'http://localhost:5174',      // Dashboard dev
]
```

**To add Vercel domain:**
Update `apps/api/src/index.ts` line 58-70 to include:
```typescript
'https://your-project.vercel.app',
'https://dashboard.arbi.ai',  // if using custom domain
```

---

## 📊 Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { /* ... */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

**Marketplace Listing Object:**
```typescript
{
  listingId: string;           // "listing_1766360580855_24nluy3za"
  productTitle: string;        // "Sony Alpha A7 IV"
  productDescription: string;  // Full description
  productPrice: number;        // 2498.00 (what customer pays)
  supplierCost: number;        // 1748.60 (what you pay supplier)
  profitMargin: number;        // 749.40 (your profit)
  supplierUrl: string;         // "https://www.amazon.com/dp/..."
  supplierPlatform: string;    // "amazon" | "walmart" | "target"
  productImages: string[];     // ["https://res.cloudinary.com/..."]
  isActive: boolean;           // true
  createdAt: string;           // ISO timestamp
}
```

---

## 🚀 Quick Test Commands

```bash
# Health check
curl https://api.arbi.creai.dev/health

# Get all products
curl https://api.arbi.creai.dev/api/marketplace/listings

# Get single product page
curl https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za

# Scrape images
curl -X POST https://api.arbi.creai.dev/api/scrape-rainforest/listing_1766360580855_24nluy3za

# Launch campaign
curl -X POST https://api.arbi.creai.dev/api/campaigns/launch/listing_1766360580855_24nluy3za

# Check suppliers
curl https://api.arbi.creai.dev/api/suppliers/listing_1766360580855_24nluy3za/best
```

---

## ✅ Most Important Endpoints for Your Dashboard

1. **GET /api/marketplace/listings** - Main data source ⭐
2. **POST /api/scrape-rainforest/:id** - Fetch product images
3. **POST /api/campaigns/launch/:id** - Launch ads
4. **GET /api/suppliers/:id** - Supplier management
5. **GET /product/:id** - Customer-facing product page

That's it! These 5 endpoints cover 90% of your dashboard needs.
