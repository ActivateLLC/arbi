# Custom Domain Setup - api.arbi.activate.creai.dev

## ✅ Step 1: Railway Domain Added

You've added the custom domain in Railway:
- **Domain**: `api.arbi.activate.creai.dev`
- **Port**: 8080
- **Status**: Waiting for DNS verification

---

## 📋 Step 2: DNS Configuration Required

You need to add a CNAME record in your DNS provider (where you manage `activate.creai.dev`):

### DNS Record to Add:

```
Type:  CNAME
Name:  api.arbi.activate.creai.dev
       (or just "api.arbi" if your DNS provider already shows "activate.creai.dev")
Value: arbi-production.up.railway.app
TTL:   Auto or 3600
```

### Common DNS Providers:

**Cloudflare**:
1. Log in to Cloudflare dashboard
2. Select `activate.creai.dev` domain
3. Go to DNS → Records
4. Click "Add record"
5. Type: CNAME
6. Name: `api.arbi` (Cloudflare will add `.activate.creai.dev` automatically)
7. Target: `arbi-production.up.railway.app`
8. Proxy status: DNS only (gray cloud) - IMPORTANT!
9. Click Save

**Namecheap**:
1. Domain List → Manage → Advanced DNS
2. Add New Record
3. Type: CNAME Record
4. Host: `api.arbi`
5. Value: `arbi-production.up.railway.app`
6. TTL: Automatic

**GoDaddy**:
1. DNS Management
2. Add → CNAME
3. Name: `api.arbi`
4. Value: `arbi-production.up.railway.app`
5. TTL: 1 Hour

**Google Domains / Cloud DNS**:
1. DNS → Manage Custom Records
2. Create new record
3. Host name: `api.arbi`
4. Type: CNAME
5. Data: `arbi-production.up.railway.app`
6. TTL: 3600

---

## 🔧 Step 3: Update Railway Environment Variable

After DNS is configured, you need to set the PUBLIC_URL environment variable:

### In Railway Dashboard:

1. Go to your project → Variables tab
2. Add new variable:
   ```
   PUBLIC_URL=https://api.arbi.activate.creai.dev
   ```
3. Click "Add" or "Deploy" to apply changes

This ensures all product links use your custom domain instead of Railway's default.

---

## ⏱️ Step 4: Wait for DNS Propagation

After adding the DNS record:
- **Railway SSL**: 1-5 minutes (automatic)
- **DNS Propagation**: 5-60 minutes (usually 10-15 minutes)

### Check DNS Status:

```bash
# Check if DNS is resolving
nslookup api.arbi.activate.creai.dev

# Should return something like:
# api.arbi.activate.creai.dev
# Address: xxx.xxx.xxx.xxx (Railway's IP)
```

### Check Railway SSL Status:

In Railway dashboard:
- Settings → Domains
- Look for green checkmark ✅ next to `api.arbi.activate.creai.dev`
- SSL certificate should show "Active"

---

## 🧪 Step 5: Test the Custom Domain

Once DNS propagates and Railway shows SSL as active:

```bash
# Test health endpoint
curl https://api.arbi.activate.creai.dev/health

# Expected response:
# {"status":"ok","timestamp":"2025-12-20T..."}

# Test API
curl https://api.arbi.activate.creai.dev/api/marketplace/listings

# Should return your product listings

# Test a product page in browser
# Visit: https://api.arbi.activate.creai.dev/product/listing_xxx
```

---

## 🔄 Step 6: Recreate Products with New Domain

After custom domain is working, recreate all products to get new URLs:

```bash
bash /home/user/arbi/create-all-listings.sh
```

This will:
- Create 18 new product listings
- Generate URLs using `https://api.arbi.activate.creai.dev`
- Create fresh Google Ads campaigns
- Give you shareable links with your custom domain

**New Product URLs will be**:
```
https://api.arbi.activate.creai.dev/product/listing_1766197602405_xxx
https://api.arbi.activate.creai.dev/product/listing_1766197603328_xxx
```

---

## 📊 Verification Checklist

Before recreating products, verify:

- [ ] DNS CNAME record added
- [ ] Railway shows domain as verified (green checkmark)
- [ ] Railway SSL certificate shows "Active"
- [ ] `curl https://api.arbi.activate.creai.dev/health` returns 200 OK
- [ ] PUBLIC_URL environment variable set in Railway
- [ ] Railway redeployed after adding PUBLIC_URL

Once all checked, you're ready to recreate products!

---

## 🎯 Final Product URLs

After completing setup, your product ecosystem will be:

**Frontend (Marketing Site)**:
```
https://arbi.activate.creai.dev (Vercel)
```

**API & Products**:
```
https://api.arbi.activate.creai.dev/api/marketplace/listings
https://api.arbi.activate.creai.dev/product/listing_xxx
https://api.arbi.activate.creai.dev/health
```

**Checkout Flow**:
```
User sees ad →
Clicks to: https://api.arbi.activate.creai.dev/product/listing_xxx →
Clicks "Buy Now" →
Stripe Checkout (Klarna enabled) →
Success: https://api.arbi.activate.creai.dev/product/listing_xxx/success
```

---

## 🐛 Troubleshooting

### DNS Not Resolving

```bash
# Check current DNS
dig api.arbi.activate.creai.dev

# or
nslookup api.arbi.activate.creai.dev
```

**If it returns nothing**:
- Wait longer (can take up to 48 hours but usually 10-15 minutes)
- Verify CNAME record is correct
- Check DNS provider saved the record
- Try flushing your local DNS cache

### Railway Shows "DNS Verification Failed"

**Common causes**:
1. CNAME not added yet
2. Wrong CNAME value (should be `arbi-production.up.railway.app`)
3. DNS not propagated yet - wait 10 more minutes
4. Cloudflare proxy enabled (should be DNS only)

**Fix**:
- Double-check CNAME record
- Wait 10-15 minutes
- Click "Retry" in Railway if available

### SSL Certificate Not Provisioning

**Railway automatically provisions Let's Encrypt SSL**, but if it fails:
1. Ensure DNS is fully propagated
2. Remove domain and re-add it
3. Contact Railway support if persists

### Products Still Show Old Railway Domain

**Cause**: PUBLIC_URL not set or not deployed

**Fix**:
1. Verify `PUBLIC_URL=https://api.arbi.activate.creai.dev` is set in Railway Variables
2. Trigger a redeploy
3. Recreate products using `create-all-listings.sh`

---

## 📞 Need Help?

If you encounter issues:

1. **Check Railway Logs**: Observability tab shows real-time errors
2. **Test Each Step**: Don't skip to recreation until domain is verified
3. **DNS Patience**: Most issues resolve with waiting 15-30 minutes

Once domain is working, run the product creation script and you'll have professional URLs for all 18 products! 🚀
