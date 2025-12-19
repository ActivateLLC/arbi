# Railway Database Configuration

## Environment Variables to Add to API Service

### Option 1: Single DATABASE_URL (Recommended)

Add this ONE variable to your API service:

```
DATABASE_URL=postgresql://postgres:kONropGSKnqUgBRMyoTAdbHLCiGNPOTG@turntable.proxy.rlwy.net:59232/railway?sslmode=require
```

**Why this one?** Uses the PUBLIC URL which works from Railway services.

---

### Option 2: Individual Variables (Alternative)

Or add these INDIVIDUAL variables:

```
DB_HOST=turntable.proxy.rlwy.net
DB_PORT=59232
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=kONropGSKnqUgBRMyoTAdbHLCiGNPOTG
DB_SSL=true
```

---

## ✅ Verification Steps

### 1. Add Variables in Railway

1. Go to Railway Dashboard
2. Click on your **API service** (NOT the database service)
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add `DATABASE_URL` with the value above
6. Click **Add**

### 2. Railway Will Auto-Redeploy

Watch the deployment logs. You should see:

```
🗄️  Initializing database connection...
   Host: turntable.proxy.rlwy.net:59232
   Database: railway
   SSL: enabled
✅ Database connected successfully
✅ Database models synchronized
🗄️  Defining marketplace models...
✅ Marketplace models defined: MarketplaceListing, BuyerOrder
```

### 3. Test Database Connection

Once deployed, run:

```bash
curl https://arbi-production.up.railway.app/api/marketplace/health
```

Should show:
```json
{
  "status": "ok",
  "mode": "dropshipping",
  "capitalRequired": 0,
  "features": {
    "databasePersistence": true  ← THIS SHOULD BE TRUE NOW
  }
}
```

---

## 🚨 If You See Errors

### "Database not available - using in-memory storage"

**Fix:** Double-check the DATABASE_URL is correct in API service variables.

### "ECONNREFUSED" or "Connection timeout"

**Fix:** Make sure you're using the **PUBLIC URL** (turntable.proxy.rlwy.net), not the internal one.

### "SSL/TLS connection error"

**Fix:** Add `?sslmode=require` to the end of DATABASE_URL:
```
DATABASE_URL=postgresql://postgres:kONropGSKnqUgBRMyoTAdbHLCiGNPOTG@turntable.proxy.rlwy.net:59232/railway?sslmode=require
```

---

## 📊 What Database Does

Once connected, the database stores:

### 1. **Marketplace Listings** (All products for sale)
- Product title, description, images
- Supplier price, marketplace price, profit
- Status (active, sold, expired)
- Created/updated timestamps

### 2. **Buyer Orders** (All purchases)
- Customer email, shipping address
- Payment details (Stripe payment intent ID)
- Supplier order details
- Shipment tracking
- Actual profit per order

### 3. **Opportunities** (Coming soon)
- All scanned opportunities
- Prevents duplicate processing
- Historical tracking for analytics

---

## 🎯 Benefits of Database (vs In-Memory)

**Before (In-Memory):**
- ❌ Data lost on server restart
- ❌ Can't scale to multiple instances
- ❌ No historical data
- ❌ Limited to ~10k opportunities

**After (PostgreSQL):**
- ✅ Data persists forever
- ✅ Scale to millions of opportunities
- ✅ Multi-user ready (dashboard, mobile app, etc.)
- ✅ Full analytics and reporting
- ✅ Can handle billions of records eventually

---

## ✅ Next Steps After Database is Connected

1. **Verify connection** (see test above)
2. **Enable Turbo Mode:**
   ```bash
   curl -X POST https://arbi-production.up.railway.app/api/revenue/turbo-mode \
     -H "Content-Type: application/json" \
     -d '{"enabled": true}'
   ```

3. **Start Autonomous Listing:**
   ```bash
   curl -X POST https://arbi-production.up.railway.app/api/autonomous-control/start-listing \
     -H "Content-Type: application/json" \
     -d '{
       "scanIntervalMinutes": 5,
       "minScore": 60,
       "minProfit": 30,
       "minROI": 15,
       "markupPercentage": 30,
       "maxListingsPerRun": 50
     }'
   ```

4. **Check listings being created:**
   ```bash
   curl https://arbi-production.up.railway.app/api/marketplace/listings?status=active
   ```

5. **Launch ads and start making money!**

---

## 🚀 Database Schema (Auto-Created)

The system will automatically create these tables:

### `MarketplaceListing`
```sql
- listingId (PK)
- opportunityId
- productTitle
- productDescription
- productImages (JSON array)
- supplierPrice
- supplierUrl
- supplierPlatform
- marketplacePrice
- estimatedProfit
- status (active/sold/expired)
- listedAt
- expiresAt
- soldAt
```

### `BuyerOrder`
```sql
- orderId (PK)
- listingId (FK)
- buyerEmail
- buyerShippingAddress (JSON)
- paymentIntentId (Stripe)
- amountPaid
- supplierOrderId
- supplierPurchaseStatus
- shipmentTrackingNumber
- shipmentCarrier
- status (payment_received/purchasing/shipped/delivered)
- actualProfit
- createdAt
- deliveredAt
```

---

**GO ADD THE DATABASE_URL TO RAILWAY NOW!**

Then watch the deployment logs and verify the connection. 🚀
