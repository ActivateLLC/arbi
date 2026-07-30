# Arbi API - Complete Endpoint Reference
**Base URL:** `https://api.arbi.creai.dev`
**Total Endpoints:** 60+
**Last Updated:** January 4, 2026

---

## Table of Contents
1. [Health & Status](#health--status)
2. [Marketplace](#marketplace)
3. [Product Images](#product-images)
4. [Google Ads Campaigns](#google-ads-campaigns)
5. [Multi-Supplier System](#multi-supplier-system)
6. [Public Product Pages](#public-product-pages)
7. [Compliance Pages](#compliance-pages)
8. [Validation & Testing](#validation--testing)
9. [AI Engine](#ai-engine)
10. [Web Automation](#web-automation)
11. [Voice Interface](#voice-interface)
12. [Payment Processing](#payment-processing)
13. [Arbitrage Discovery](#arbitrage-discovery)
14. [Autonomous System](#autonomous-system)
15. [Payout System](#payout-system)
16. [Revenue Tracking](#revenue-tracking)
17. [Webhooks](#webhooks)
18. [Quick Reference](#quick-reference)

---

## Health & Status

### GET /health
Main server health check
```bash
curl https://api.arbi.creai.dev/health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-04T12:00:00Z"
}
```

### GET /debug/config
Check which API keys are configured (without exposing values)
```bash
curl https://api.arbi.creai.dev/debug/config
```
**Response:**
```json
{
  "environment": "production",
  "port": "3000",
  "keys": {
    "stripe": true,
    "rainforest": true,
    "googleAds": true,
    "database": true
  }
}
```

### GET /api/marketplace/health
Marketplace system status
```bash
curl https://api.arbi.creai.dev/api/marketplace/health
```

---

## Marketplace
**Zero-Capital Dropshipping Model**
Buyer pays first → Auto-purchase from supplier → Direct ship → Keep profit

### POST /api/marketplace/list
Create new marketplace listing
```bash
curl -X POST https://api.arbi.creai.dev/api/marketplace/list \
  -H "Content-Type: application/json" \
  -d '{
    "productTitle": "Sony Alpha A7 IV Camera",
    "productDescription": "Professional full-frame mirrorless camera",
    "marketplacePrice": 2498.00,
    "supplierPrice": 1748.60,
    "supplierUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
    "supplierPlatform": "amazon"
  }'
```

### GET /api/marketplace/listings
Get all marketplace listings ⭐ **PRIMARY DASHBOARD ENDPOINT**
```bash
curl https://api.arbi.creai.dev/api/marketplace/listings
```
**Response:**
```json
{
  "success": true,
  "listings": [
    {
      "listingId": "listing_1766360580855_24nluy3za",
      "opportunityId": "opp_sony_a7iv",
      "productTitle": "Sony Alpha A7 IV Mirrorless Full-Frame Camera Body",
      "productDescription": "Professional 33MP full-frame camera...",
      "productImages": [
        "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360580/..."
      ],
      "supplierPrice": "1748.60",
      "supplierUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
      "supplierPlatform": "amazon",
      "marketplacePrice": "2498.00",
      "estimatedProfit": "749.40",
      "status": "active",
      "listedAt": "2025-12-21T19:43:00.855Z",
      "expiresAt": "2025-12-28T19:43:00.855Z",
      "createdAt": "2025-12-21T19:43:00.855Z",
      "updatedAt": "2026-01-04T00:56:17.925Z"
    }
  ]
}
```

### DELETE /api/marketplace/listings/:listingId
Delete specific listing
```bash
curl -X DELETE https://api.arbi.creai.dev/api/marketplace/listings/listing_123
```

### POST /api/marketplace/checkout
Buyer checkout with Stripe
```bash
curl -X POST https://api.arbi.creai.dev/api/marketplace/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "listing_123",
    "buyerEmail": "customer@example.com",
    "shippingAddress": {
      "name": "John Doe",
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "US"
    }
  }'
```

### GET /api/marketplace/orders
Get order history
```bash
curl https://api.arbi.creai.dev/api/marketplace/orders
```

---

## Product Images
**Scrape images from Amazon and upload to Cloudinary**

### POST /api/scrape-rainforest/:listingId
Rainforest API scraper (premium, bypasses Amazon bot detection)
```bash
curl -X POST https://api.arbi.creai.dev/api/scrape-rainforest/listing_1766360580855_24nluy3za
```
**Response:**
```json
{
  "success": true,
  "listingId": "listing_1766360580855_24nluy3za",
  "asin": "B0C1SLD8VK",
  "imagesFound": 5,
  "imagesUploaded": 5,
  "images": [
    "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360580/..."
  ]
}
```

### POST /api/scrape-amazon-buddy/:listingId
amazon-buddy NPM package scraper (open source)
```bash
curl -X POST https://api.arbi.creai.dev/api/scrape-amazon-buddy/listing_123
```

### POST /api/scrape-images-simple/:listingId
HTTP + Cheerio scraper (no browser)
```bash
curl -X POST https://api.arbi.creai.dev/api/scrape-images-simple/listing_123
```

### POST /api/scrape-images/:listingId
Stagehand browser automation scraper
```bash
curl -X POST https://api.arbi.creai.dev/api/scrape-images/listing_123
```

### POST /api/fetch-images/:listingId
Generic image fetcher
```bash
curl -X POST https://api.arbi.creai.dev/api/fetch-images/listing_123
```

### POST /api/cleanup-placeholders/:listingId
Remove placeholder images from database
```bash
curl -X POST https://api.arbi.creai.dev/api/cleanup-placeholders/listing_123
```
**Response:**
```json
{
  "success": true,
  "listingId": "listing_123",
  "before": 5,
  "after": 1,
  "removed": 4,
  "images": ["https://res.cloudinary.com/..."]
}
```

---

## Google Ads Campaigns
**Automated Google Ads campaign management**

### POST /api/campaigns/launch
Launch ads for all products
```bash
curl -X POST https://api.arbi.creai.dev/api/campaigns/launch \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 50,
    "bidStrategy": "MAXIMIZE_CONVERSIONS"
  }'
```

### POST /api/campaigns/launch/:listingId
Launch ad for specific product
```bash
curl -X POST https://api.arbi.creai.dev/api/campaigns/launch/listing_1766360580855_24nluy3za
```
**Response:**
```json
{
  "success": true,
  "campaignId": "campaign_123",
  "campaignName": "Sony Alpha A7 IV - Dropship",
  "status": "ENABLED",
  "budget": 50,
  "targetUrl": "https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za"
}
```

### GET /api/campaigns/status
Get campaign status
```bash
curl https://api.arbi.creai.dev/api/campaigns/status
```

### GET /api/campaigns/live
Get live campaigns
```bash
curl https://api.arbi.creai.dev/api/campaigns/live
```

### GET /api/campaigns/info
Get campaign details
```bash
curl https://api.arbi.creai.dev/api/campaigns/info
```

---

## Multi-Supplier System
**Automatic failover when primary supplier goes out of stock**

### POST /api/suppliers
Add new supplier to a listing
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

### POST /api/suppliers/bulk
Add multiple suppliers at once
```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "listing_123",
    "suppliers": [
      {
        "supplierName": "Amazon",
        "supplierUrl": "https://amazon.com/dp/XXX",
        "supplierCost": 100,
        "priority": 1
      },
      {
        "supplierName": "Walmart",
        "supplierUrl": "https://walmart.com/ip/YYY",
        "supplierCost": 105,
        "priority": 2
      }
    ]
  }'
```

### GET /api/suppliers/:listingId
Get all suppliers for a product
```bash
curl https://api.arbi.creai.dev/api/suppliers/listing_1766360580855_24nluy3za
```

### GET /api/suppliers/:listingId/best
Get best available supplier (highest priority + in stock)
```bash
curl https://api.arbi.creai.dev/api/suppliers/listing_1766360580855_24nluy3za/best
```
**Response:**
```json
{
  "success": true,
  "supplier": {
    "supplierId": "supplier_123",
    "supplierName": "Amazon",
    "supplierUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
    "supplierCost": 1748.60,
    "priority": 1,
    "isAvailable": true,
    "lastChecked": "2026-01-04T12:00:00Z"
  }
}
```

### PUT /api/suppliers/:supplierId/stock
Update stock status
```bash
curl -X PUT https://api.arbi.creai.dev/api/suppliers/supplier_123/stock \
  -H "Content-Type: application/json" \
  -d '{
    "isAvailable": false
  }'
```

### DELETE /api/suppliers/:supplierId
Remove supplier
```bash
curl -X DELETE https://api.arbi.creai.dev/api/suppliers/supplier_123
```

### POST /api/suppliers/:listingId/test
Test supplier availability
```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers/listing_123/test
```

### POST /api/suppliers/monitor/start
Start stock monitoring (checks every 6 hours)
```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers/monitor/start
```

### POST /api/suppliers/monitor/stop
Stop stock monitoring
```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers/monitor/stop
```

### POST /api/suppliers/monitor/check
Manual stock check for all suppliers
```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers/monitor/check
```

### GET /api/suppliers/monitor/status
Get monitor status
```bash
curl https://api.arbi.creai.dev/api/suppliers/monitor/status
```

---

## Public Product Pages
**Customer-facing pages (no authentication required)**

### GET /product/:listingId
Product landing page (HTML)
```bash
curl https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za
```
**Returns:** Beautiful HTML product page with:
- Product images (gallery if 2+ images)
- Title and description
- Price and "Buy Now" button
- Stripe checkout integration
- SEO optimized

**Example URL:** `https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za`

### POST /product/:listingId/checkout
Direct Stripe checkout
```bash
curl -X POST https://api.arbi.creai.dev/product/listing_123/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com"
  }'
```

### GET /checkout/:listingId
Direct checkout page
```bash
curl https://api.arbi.creai.dev/checkout/listing_123
```

### GET /buy/:listingId
Short URL redirect to checkout
```bash
curl https://api.arbi.creai.dev/buy/listing_123
```

---

## Compliance Pages
**Required for Google Ads approval**

### GET /privacy
Privacy policy page
```bash
curl https://api.arbi.creai.dev/privacy
```

### GET /terms
Terms of service page
```bash
curl https://api.arbi.creai.dev/terms
```

### GET /refund
Refund policy page
```bash
curl https://api.arbi.creai.dev/refund
```

### GET /contact
Contact page
```bash
curl https://api.arbi.creai.dev/contact
```

---

## Validation & Testing

### POST /api/validate/products
Validate products before launching ads
```bash
curl -X POST https://api.arbi.creai.dev/api/validate/products
```

### POST /api/backfill/campaigns
Create campaigns for existing listings
```bash
curl -X POST https://api.arbi.creai.dev/api/backfill/campaigns
```

### POST /api/reddit/post
Post to Reddit
```bash
curl -X POST https://api.arbi.creai.dev/api/reddit/post \
  -H "Content-Type: application/json" \
  -d '{
    "subreddit": "deals",
    "title": "Amazing deal on Sony A7 IV",
    "url": "https://api.arbi.creai.dev/product/listing_123"
  }'
```

### GET /api/test/google-ads
Test Google Ads API connection
```bash
curl https://api.arbi.creai.dev/api/test/google-ads
```

### GET /api/test/assets
Test asset creation
```bash
curl https://api.arbi.creai.dev/api/test/assets
```

---

## AI Engine

### POST /api/ai/completion
OpenAI text completion
```bash
curl -X POST https://api.arbi.creai.dev/api/ai/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a product description for a camera",
    "model": "gpt-4"
  }'
```

### POST /api/ai/orchestrate
Multi-agent orchestration
```bash
curl -X POST https://api.arbi.creai.dev/api/ai/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "research_product",
    "productUrl": "https://amazon.com/dp/XXX"
  }'
```

### GET /api/ai/health
AI engine status
```bash
curl https://api.arbi.creai.dev/api/ai/health
```

---

## Web Automation
**Stagehand browser automation**

### POST /api/web/session
Create browser session
```bash
curl -X POST https://api.arbi.creai.dev/api/web/session
```

### DELETE /api/web/session/:sessionId
Close browser session
```bash
curl -X DELETE https://api.arbi.creai.dev/api/web/session/session_123
```

### POST /api/web/navigate
Navigate to URL
```bash
curl -X POST https://api.arbi.creai.dev/api/web/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123",
    "url": "https://amazon.com"
  }'
```

### GET /api/web/url
Get current URL
```bash
curl https://api.arbi.creai.dev/api/web/url?sessionId=session_123
```

### POST /api/web/back
Navigate back
```bash
curl -X POST https://api.arbi.creai.dev/api/web/back \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session_123"}'
```

### POST /api/web/forward
Navigate forward
```bash
curl -X POST https://api.arbi.creai.dev/api/web/forward \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session_123"}'
```

### POST /api/web/refresh
Refresh page
```bash
curl -X POST https://api.arbi.creai.dev/api/web/refresh \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session_123"}'
```

### GET /api/web/health
Web automation status
```bash
curl https://api.arbi.creai.dev/api/web/health
```

---

## Voice Interface

### GET /api/voice/health
Voice system status
```bash
curl https://api.arbi.creai.dev/api/voice/health
```

---

## Payment Processing

### POST /api/payment/process
Process payment via Hyperswitch
```bash
curl -X POST https://api.arbi.creai.dev/api/payment/process \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2498.00,
    "currency": "USD",
    "paymentMethod": "card"
  }'
```

### POST /api/payment/refund
Process refund
```bash
curl -X POST https://api.arbi.creai.dev/api/payment/refund \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_123",
    "amount": 2498.00
  }'
```

### GET /api/payment/health
Payment system status
```bash
curl https://api.arbi.creai.dev/api/payment/health
```

---

## Arbitrage Discovery

### GET /api/arbitrage/opportunities
Find arbitrage opportunities
```bash
curl https://api.arbi.creai.dev/api/arbitrage/opportunities
```

### POST /api/arbitrage/evaluate
Evaluate specific opportunity
```bash
curl -X POST https://api.arbi.creai.dev/api/arbitrage/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "productUrl": "https://amazon.com/dp/XXX",
    "targetMargin": 20
  }'
```

### POST /api/arbitrage/execute
Execute arbitrage trade
```bash
curl -X POST https://api.arbi.creai.dev/api/arbitrage/execute \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "opp_123"
  }'
```

### GET /api/arbitrage/settings
Get user settings
```bash
curl https://api.arbi.creai.dev/api/arbitrage/settings
```

### PUT /api/arbitrage/settings
Update user settings
```bash
curl -X PUT https://api.arbi.creai.dev/api/arbitrage/settings \
  -H "Content-Type: application/json" \
  -d '{
    "minMargin": 20,
    "maxPrice": 5000
  }'
```

### GET /api/arbitrage/health
Arbitrage engine status
```bash
curl https://api.arbi.creai.dev/api/arbitrage/health
```

---

## Autonomous System

### GET /api/autonomous/opportunities
Get autonomous scanning results
```bash
curl https://api.arbi.creai.dev/api/autonomous/opportunities
```

### GET /api/autonomous/stats
System statistics
```bash
curl https://api.arbi.creai.dev/api/autonomous/stats
```

### POST /api/autonomous-control/start-listing
Start autonomous listing job
```bash
curl -X POST https://api.arbi.creai.dev/api/autonomous-control/start-listing \
  -H "Content-Type: application/json" \
  -d '{
    "productUrl": "https://amazon.com/dp/XXX"
  }'
```

---

## Payout System

### POST /api/payout/execute
Execute trade and transfer profit to bank
```bash
curl -X POST https://api.arbi.creai.dev/api/payout/execute \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_123",
    "bankAccount": "acct_123"
  }'
```

### GET /api/payout/history
Get payout history
```bash
curl https://api.arbi.creai.dev/api/payout/history
```

### POST /api/payout/auto-enable
Enable autopilot mode (automatic payouts)
```bash
curl -X POST https://api.arbi.creai.dev/api/payout/auto-enable
```

---

## Revenue Tracking

### Revenue endpoints
Detailed in `revenue.ts` - track revenue targets and performance

---

## Webhooks

### POST /api/webhooks/stripe
Stripe payment webhooks (requires raw body)
```bash
# This endpoint is called by Stripe automatically
# Signature verification required
```

### POST /webhooks/dropshipping/amazon/orders
Amazon order notifications
```bash
curl -X POST https://api.arbi.creai.dev/webhooks/dropshipping/amazon/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "amazon_order_123",
    "trackingNumber": "1Z999AA10123456784"
  }'
```

### POST /webhooks/test
Test webhook
```bash
curl -X POST https://api.arbi.creai.dev/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### GET /webhooks/health
Webhook system health
```bash
curl https://api.arbi.creai.dev/webhooks/health
```

---

## Quick Reference

### Most Important Endpoints

**Dashboard Data:**
```bash
GET  /api/marketplace/listings            # Primary data source
GET  /health                               # System status
```

**Product Management:**
```bash
POST /api/marketplace/list                # Create listing
POST /api/scrape-rainforest/:id           # Fetch images
POST /api/campaigns/launch/:id            # Launch ads
GET  /api/suppliers/:id/best              # Get best supplier
```

**Customer Flow:**
```bash
GET  /product/:id                         # Product page
POST /product/:id/checkout                # Checkout
```

**Monitoring:**
```bash
POST /api/suppliers/monitor/start         # Start stock monitoring
GET  /api/campaigns/status                # Ad performance
GET  /api/marketplace/orders              # Orders
```

---

## Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here",
  "details": "Additional context (optional)"
}
```

---

## CORS Configuration

**Allowed Origins:**
- `https://www.arbi.creai.dev`
- `https://arbi.creai.dev`
- `https://dashboard.arbi.creai.dev`
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:5174`

**To add new domain:** Update `apps/api/src/index.ts` lines 59-70

---

## Authentication

Most endpoints currently **do not require authentication**.

For production, implement:
- API keys for admin endpoints
- JWT tokens for user sessions
- Webhook signature verification (Stripe webhooks already implemented)

---

## Rate Limiting

Currently no rate limiting implemented.

Recommended limits for production:
- Public endpoints: 100 req/min
- Admin endpoints: 1000 req/min
- Webhook endpoints: Unlimited (verified signatures)

---

## Error Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (listing/resource doesn't exist)
- `500` - Server Error (check logs)

---

## Testing Commands

**Quick Health Check:**
```bash
curl https://api.arbi.creai.dev/health
```

**Get Sample Listing:**
```bash
curl https://api.arbi.creai.dev/api/marketplace/listings | jq '.listings[0]'
```

**View Product Page:**
```bash
open https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za
```

**Test Image Scraper:**
```bash
curl -X POST https://api.arbi.creai.dev/api/scrape-rainforest/listing_1766360580855_24nluy3za
```

---

## Environment Variables Required

```bash
# Core
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Images
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RAINFOREST_API_KEY=...

# Google Ads
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=...

# Email (Optional)
EMAIL_FROM=...
EMAIL_TO=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Reddit (Optional)
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=...
REDDIT_PASSWORD=...
```

---

## Support

**API Base:** `https://api.arbi.creai.dev`
**Repository:** `https://github.com/ActivateLLC/arbi`
**Dashboard:** `https://github.com/ActivateLLC/01.04.26Arbi.ai`

---

**Total Endpoints: 60+**
**All Live & Operational** ✅
