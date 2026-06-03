# 🔄 Multi-Supplier Fallback System - Complete Guide

## Overview

The fallback system ensures you **never lose a sale** due to out-of-stock suppliers. When your primary supplier runs out, the system automatically sources from alternative suppliers while maintaining profitability.

---

## 🎯 How It Works

```
Customer purchases Sony A7 IV → $3,247.40 paid
              ↓
    Try PRIMARY: Amazon ($2,498)
              ↓
           OUT OF STOCK
              ↓
    Try FALLBACK 1: B&H Photo ($2,498)
              ↓
           IN STOCK ✅
              ↓
    Purchase for $2,498
    Ship to customer
    Profit: $749.40
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd apps/api
pnpm install
```

New dependencies added:
- `nodemailer` - Email notifications
- `node-cron` - Automated stock monitoring

### 2. Configure Email Notifications (Optional but Recommended)

Add to your `.env`:

```bash
# Email Notifications
NOTIFICATION_EMAIL=your-gmail@gmail.com
NOTIFICATION_PASSWORD=your-app-password
OWNER_EMAIL=where-to-send-alerts@gmail.com

# OR use SendGrid
SENDGRID_API_KEY=your-sendgrid-key

# OR use Mailgun
MAILGUN_API_KEY=your-mailgun-key
```

**For Gmail:**
1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password)

### 3. Set Up Suppliers for Sony A7 IV

```bash
npx tsx setup-sony-a7iv-suppliers.ts
```

This adds 4 suppliers with automatic fallback:
- **Priority 0 (Primary):** Amazon - $2,498
- **Priority 1 (Fallback):** B&H Photo - $2,498
- **Priority 2 (Fallback):** Adorama - $2,498
- **Priority 3 (Fallback):** Amazon Renewed - $2,199 (higher profit!)

### 4. Enable Stock Monitoring

```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers/monitor/start
```

This starts a cron job that checks stock every 6 hours.

---

## 📡 API Endpoints

### Add a Single Supplier

```bash
POST /api/suppliers
```

```json
{
  "listingId": "listing_1766360580855_24nluy3za",
  "vendor": "amazon",
  "productUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
  "price": 2498.00,
  "priority": 0
}
```

### Add Multiple Suppliers at Once

```bash
POST /api/suppliers/bulk
```

```json
{
  "listingId": "listing_1766360580855_24nluy3za",
  "suppliers": [
    {
      "vendor": "amazon",
      "productUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
      "price": 2498.00,
      "priority": 0
    },
    {
      "vendor": "bhphoto",
      "productUrl": "https://www.bhphotovideo.com/...",
      "price": 2498.00,
      "priority": 1
    }
  ]
}
```

### Get All Suppliers for a Product

```bash
GET /api/suppliers/:listingId
```

Response:
```json
{
  "success": true,
  "listingId": "listing_1766360580855_24nluy3za",
  "suppliers": [...],
  "stats": {
    "total": 4,
    "active": 4,
    "inStock": 3,
    "outOfStock": 1,
    "cheapest": {...},
    "mostExpensive": {...}
  }
}
```

### Find Best Available Supplier

```bash
GET /api/suppliers/:listingId/best?marketplacePrice=3247.40&minProfit=20
```

Returns the best supplier based on:
- Stock availability
- Profitability (must meet minimum profit)
- Priority (lowest priority number wins)

### Update Supplier Stock Status

```bash
PUT /api/suppliers/:supplierId/stock
```

```json
{
  "inStock": false,
  "price": 2498.00
}
```

### Test Fulfillment (No Purchase)

```bash
POST /api/suppliers/:listingId/test
```

Shows which supplier would be used without actually purchasing.

### Stock Monitor Controls

```bash
# Start monitoring
POST /api/suppliers/monitor/start

# Stop monitoring
POST /api/suppliers/monitor/stop

# Run manual check
POST /api/suppliers/monitor/check

# Get status
GET /api/suppliers/monitor/status
```

---

## 📧 Email Notifications

You'll receive emails for:

### 1. Sale Notifications

Subject: `💰 New Sale! Profit: $749.40 - Sony Alpha A7 IV`

Includes:
- Product details
- Profit breakdown
- Fulfillment status
- Tracking number (if available)

### 2. Out-of-Stock Alerts

**With Fallback:**
Subject: `⚠️ Fallback Supplier Used: Sony Alpha A7 IV`

Details:
- Primary supplier out of stock
- Which fallback was used
- Profit difference

**No Fallback:**
Subject: `🚨 Product Out of Stock: Sony Alpha A7 IV`

Action required:
- Pause Google Ads campaign
- Find new suppliers
- Monitor for restock

### 3. Price Change Alerts

Subject: `📈 Price Change Alert: Sony Alpha A7 IV`

Includes:
- Old vs new price
- Profit impact
- Whether still profitable
- Recommended actions

**Critical Alert:**
Subject: `🚨 URGENT: Price Increase Makes Product Unprofitable`

Immediate action required!

---

## 🔍 Stock Monitoring

The stock monitor automatically:

- **Checks stock status** every 6 hours
- **Detects price changes** (>5% threshold)
- **Sends email alerts** for changes
- **Updates supplier database** with current info
- **Calculates new profit margins**

**How it works:**

1. Fetches all active listings
2. Gets all suppliers for each listing
3. Validates each supplier via Rainforest API (if configured)
4. Compares with stored data
5. Sends alerts if changed
6. Updates database

**Configure check frequency:**

```javascript
// Every 6 hours (default)
POST /api/suppliers/monitor/start
{ "schedule": "0 */6 * * *" }

// Every hour
{ "schedule": "0 * * * *" }

// Every 12 hours
{ "schedule": "0 */12 * * *" }

// Daily at 9 AM
{ "schedule": "0 9 * * *" }
```

---

## 🧪 Testing the System

### Scenario 1: Test Fallback Logic

```bash
# 1. Check current best supplier
curl https://api.arbi.creai.dev/api/suppliers/listing_1766360580855_24nluy3za/best?marketplacePrice=3247.40

# 2. Mark primary as out of stock
curl -X PUT https://api.arbi.creai.dev/api/suppliers/{primary-supplier-id}/stock \
  -H "Content-Type: application/json" \
  -d '{"inStock": false}'

# 3. Check best supplier again (should be fallback)
curl https://api.arbi.creai.dev/api/suppliers/listing_1766360580855_24nluy3za/best?marketplacePrice=3247.40

# 4. Verify you received email notification
```

### Scenario 2: Test Stock Monitor

```bash
# Run manual check
curl -X POST https://api.arbi.creai.dev/api/suppliers/monitor/check

# Check logs to see what was detected
```

### Scenario 3: Test Full Purchase Flow

1. Go to: `https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za`
2. Click "Buy Now"
3. Complete Stripe test checkout
4. System will:
   - Find best supplier
   - Attempt purchase
   - Fall back if needed
   - Send email notification

**Use Stripe test cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## 💰 ROI Calculator

### Without Fallback System

```
10 sales/month × $749.40 profit = $7,494

Losses:
- 2 sales fail (out of stock) = -$1,498.80
- Wasted ad spend on failed sales = -$360.00

Net Profit: $5,635.20
```

### With Fallback System

```
10 sales/month × $749.40 profit = $7,494

Fallback scenarios:
- 2 sales use fallback (same price) = $0 loss
- OR 2 sales use cheaper fallback = +$596.82

Net Profit: $7,494 - $8,090.82

GAIN: +$1,858.80 - $2,455.62 (33-44% increase!)
```

---

## 📊 Monitoring Dashboard

### Check System Health

```bash
# Get supplier stats
curl https://api.arbi.creai.dev/api/suppliers/listing_1766360580855_24nluy3za

# Get monitor status
curl https://api.arbi.creai.dev/api/suppliers/monitor/status
```

### Sample Response

```json
{
  "running": true,
  "isChecking": false,
  "schedule": "every 6 hours",
  "lastCheck": "2026-01-03T18:00:00.000Z",
  "stats": {
    "total": 4,
    "active": 4,
    "inStock": 3,
    "outOfStock": 1
  }
}
```

---

## 🔧 Troubleshooting

### Email Notifications Not Working

1. **Check environment variables:**
   ```bash
   curl https://api.arbi.creai.dev/debug/config
   ```

2. **Test Gmail app password:**
   - Must use App Password, not regular password
   - 2FA must be enabled

3. **Check logs:**
   ```bash
   # Look for email initialization messages
   grep "Email notifications" logs/api.log
   ```

### Stock Monitor Not Running

1. **Check if enabled:**
   ```bash
   curl https://api.arbi.creai.dev/api/suppliers/monitor/status
   ```

2. **Start manually:**
   ```bash
   curl -X POST https://api.arbi.creai.dev/api/suppliers/monitor/start
   ```

3. **Set environment variable for auto-start:**
   ```bash
   ENABLE_STOCK_MONITOR=true
   ```

### Suppliers Not Found

1. **Verify suppliers were added:**
   ```bash
   curl https://api.arbi.creai.dev/api/suppliers/listing_1766360580855_24nluy3za
   ```

2. **Re-run setup script:**
   ```bash
   npx tsx setup-sony-a7iv-suppliers.ts
   ```

---

## 📝 Adding Suppliers for Other Products

### Example: MacBook Air M2

```bash
curl -X POST https://api.arbi.creai.dev/api/suppliers/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "listing_1766517477209_fcmne7ix1",
    "suppliers": [
      {
        "vendor": "amazon",
        "productUrl": "https://amazon.com/dp/B0B3C2R8MP",
        "price": 999.00,
        "priority": 0
      },
      {
        "vendor": "bhphoto",
        "productUrl": "https://www.bhphotovideo.com/...",
        "price": 999.00,
        "priority": 1
      },
      {
        "vendor": "adorama",
        "productUrl": "https://www.adorama.com/...",
        "price": 999.00,
        "priority": 2
      }
    ]
  }'
```

---

## 🚀 Production Deployment

### Environment Variables Checklist

```bash
# Required for fallback system
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
ENABLE_AUTO_FULFILLMENT=true

# Optional but recommended
NOTIFICATION_EMAIL=alerts@yourdomain.com
NOTIFICATION_PASSWORD=your-app-password
OWNER_EMAIL=you@yourdomain.com

# For stock validation
RAINFOREST_API_KEY=your-rainforest-key

# Auto-start stock monitor
ENABLE_STOCK_MONITOR=true
NODE_ENV=production
```

### Deployment Steps

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Build:**
   ```bash
   pnpm --filter @arbi/api build
   ```

3. **Deploy to Railway:**
   ```bash
   git push
   ```

4. **Set up suppliers:**
   ```bash
   npx tsx setup-sony-a7iv-suppliers.ts
   ```

5. **Start stock monitor:**
   ```bash
   curl -X POST https://your-api-url/api/suppliers/monitor/start
   ```

6. **Verify everything:**
   ```bash
   curl https://your-api-url/api/suppliers/monitor/status
   ```

---

## 📈 Success Metrics

Track these metrics to measure fallback system performance:

- **Fallback Usage Rate:** % of orders using fallbacks
- **Lost Sales Prevented:** Orders saved by fallbacks
- **Profit Variance:** Average profit difference with fallbacks
- **Stock Accuracy:** % of suppliers correctly marked
- **Email Alert Response Time:** How fast you act on alerts

---

## ✅ Next Steps

1. ✅ Install dependencies (`pnpm install`)
2. ✅ Configure email notifications
3. ✅ Run setup script for Sony A7 IV
4. ✅ Start stock monitor
5. ✅ Test with a purchase
6. ⏳ Add suppliers for other high-value products
7. ⏳ Monitor performance and adjust

---

## 💡 Pro Tips

1. **Use cheaper fallbacks when available** - Amazon Renewed can increase profit
2. **Monitor price changes** - Suppliers may discount, increasing your profit
3. **Add 3-4 suppliers per product** - Ensures availability
4. **Check monitor logs daily** - Catch issues early
5. **Respond to email alerts quickly** - Pause ads if unprofitable

---

## 🆘 Need Help?

- Review this guide
- Check API logs
- Test with Stripe test mode first
- Verify environment variables
- Run setup script again

The fallback system is designed to **maximize profit while minimizing lost sales**. Set it up once and let it run automatically! 🚀
