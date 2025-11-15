# Complete API Keys Setup Guide

**All API keys needed for the full ARBI system**

---

## 🎯 PRIORITY ORDER (What to Get First)

### CRITICAL (Get These First - Week 1):
1. ✅ **eBay Finding API** - For scanning products (APPLIED ✅)
2. 🟡 **Cloudinary** - For hosting product images (FREE)

### IMPORTANT (Get These Week 2):
3. 🟡 **Rainforest API** - For Amazon price data (1000 free requests)
4. 🟡 **Resend** - For sending emails (100 emails/day free)

### ADVANCED (Get When Scaling):
5. 🔴 **eBay Seller API** - For auto-creating eBay listings
6. 🔴 **Amazon SP-API** - For auto-creating Amazon listings
7. 🔴 **Stripe** - For payment processing

---

## 1. eBay Finding API (CRITICAL - Already Applied ✅)

**Purpose:** Scan eBay for products and prices

**Status:** ✅ You applied - waiting for approval (1 business day)

**Once Approved:**

### Get Your Keys:
1. Go to: https://developer.ebay.com/my/keys
2. Click on your application
3. Copy these 3 keys:

```
App ID (Client ID): YourAppId-YourName-PRD-abcd1234-abcd1234
Cert ID (Client Secret): PRD-abcd1234abcd1234-abcd1234
Dev ID: abcd1234-abcd-1234-abcd-abcd12345678
```

### Add to Railway:
```bash
EBAY_APP_ID=YourAppId-YourName-PRD-abcd1234-abcd1234
EBAY_CERT_ID=PRD-abcd1234abcd1234-abcd1234
EBAY_DEV_ID=abcd1234-abcd-1234-abcd-abcd12345678
```

### Add Locally (apps/api/.env.local):
```bash
EBAY_APP_ID=YourAppId-YourName-PRD-abcd1234-abcd1234
EBAY_CERT_ID=PRD-abcd1234abcd1234-abcd1234
EBAY_DEV_ID=abcd1234-abcd-1234-abcd-abcd12345678
```

**What It Enables:**
- ✅ Real-time eBay product scanning
- ✅ Price monitoring
- ✅ Finding arbitrage opportunities
- ✅ Autonomous scanning every 15 minutes

---

## 2. Cloudinary (CRITICAL for Dropshipping)

**Purpose:** Host product images for your listings

**Why Needed:** Can't hotlink images from eBay/Amazon - need to download and re-host

**Sign Up (FREE):**
1. Go to: https://cloudinary.com/users/register/free
2. Sign up with email
3. Free tier includes:
   - 25 GB storage
   - 25 GB bandwidth/month
   - Unlimited transformations

### Get Your Keys:
1. After signup, go to: https://cloudinary.com/console
2. Dashboard shows your credentials:

```
Cloud Name: your-cloud-name
API Key: 123456789012345
API Secret: abcdefghijklmnopqrstuvwxyz12345
```

### Add to Railway:
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12345
```

### Add Locally:
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12345
```

**What It Enables:**
- ✅ Auto photo extraction from eBay/Amazon
- ✅ Image hosting for your listings
- ✅ Fast CDN delivery
- ✅ Zero-capital dropshipping workflow

---

## 3. Rainforest API (Optional but Recommended)

**Purpose:** Get Amazon product data and prices

**Why Needed:** Amazon doesn't allow web scraping - need API

**Sign Up (FREE 1000 requests):**
1. Go to: https://www.rainforestapi.com/
2. Click "Start Free Trial"
3. Sign up with email
4. Free tier: 1,000 requests (enough for 1 month of testing)

### Get Your Key:
1. After signup, go to Dashboard
2. Copy your API key:

```
API Key: abcd1234efgh5678ijkl9012mnop3456
```

### Add to Railway:
```bash
RAINFOREST_API_KEY=abcd1234efgh5678ijkl9012mnop3456
```

### Add Locally:
```bash
RAINFOREST_API_KEY=abcd1234efgh5678ijkl9012mnop3456
```

**What It Enables:**
- ✅ Amazon price checking
- ✅ Finding eBay → Amazon arbitrage opportunities
- ✅ Multi-platform scanning
- ✅ Higher profit opportunities

**Cost After Free Tier:**
- $0.01 per request
- $10 = 1,000 requests
- With smart caching, $50/month is plenty

---

## 4. Resend (For Email Notifications)

**Purpose:** Send welcome emails, alerts, notifications

**Sign Up (FREE 100 emails/day):**
1. Go to: https://resend.com/
2. Sign up with email
3. Free tier: 100 emails/day, 1,000/month

### Get Your Key:
1. After signup, go to: https://resend.com/api-keys
2. Click "Create API Key"
3. Name it "ARBI Production"
4. Copy the key:

```
API Key: re_123abc456def789ghi012jkl345mno
```

### Add to Railway:
```bash
RESEND_API_KEY=re_123abc456def789ghi012jkl345mno
FROM_EMAIL=noreply@arbi.creai.dev
```

### Add Locally:
```bash
RESEND_API_KEY=re_123abc456def789ghi012jkl345mno
FROM_EMAIL=noreply@arbi.creai.dev
```

### Verify Domain (Optional):
1. In Resend dashboard, add domain: `arbi.creai.dev`
2. Add DNS records to GoDaddy
3. Verify in Resend
4. Now emails come from your domain!

**What It Enables:**
- ✅ Welcome emails to new users
- ✅ Opportunity alerts (90+ score deals)
- ✅ Order notifications
- ✅ Weekly profit reports

---

## 5. eBay Seller API (Advanced - For Auto-Listing)

**Purpose:** Automatically create eBay listings

**Requirements:**
- Same eBay Developer account
- Must have eBay seller account
- Need OAuth 2.0 user token

**Setup (More Complex):**

### Step 1: Get OAuth Token
1. Go to: https://developer.ebay.com/my/auth/?env=production&index=0
2. Sign in with eBay account
3. Select these scopes:
   - `https://api.ebay.com/oauth/api_scope/sell.inventory`
   - `https://api.ebay.com/oauth/api_scope/sell.marketing`
   - `https://api.ebay.com/oauth/api_scope/sell.account`
4. Click "Get OAuth Application Access Token"
5. Copy the token

```
Token: v^1.1#i^1#p^3#f^0#r^1#I^3#t^Ul4xMF8...
```

**WARNING:** Token expires every 2 hours! Need refresh token for production.

### Step 2: Get Refresh Token (Production)
This is more complex - requires OAuth flow setup. We can implement this when needed.

### Add to Railway:
```bash
EBAY_SELLER_ACCESS_TOKEN=v^1.1#i^1#p^3#f^0#r^1...
EBAY_SELLER_REFRESH_TOKEN=v^1.1#i^1#p^3#I^3...
```

### Step 3: Set Up Business Policies
1. Go to: https://www.ebay.com/ship/prf
2. Create:
   - Payment policy
   - Fulfillment policy
   - Return policy
3. Get policy IDs

```bash
EBAY_PAYMENT_POLICY_ID=123456789
EBAY_FULFILLMENT_POLICY_ID=987654321
EBAY_RETURN_POLICY_ID=456789123
EBAY_LOCATION_KEY=default_location
```

**What It Enables:**
- ✅ Auto-create eBay listings
- ✅ Semi-automated dropshipping
- ✅ Bulk listing creation
- ✅ Price updates

---

## 6. Amazon SP-API (Advanced - For Amazon Auto-Listing)

**Purpose:** Automatically create Amazon listings

**Requirements:**
- Amazon Seller Central account ($39.99/month Professional plan)
- SP-API developer application
- AWS IAM user with permissions

**This is VERY complex - we can set up later when scaling**

**Required Keys:**
```bash
AMAZON_SP_REFRESH_TOKEN=Atzr|IwEBIK...
AMAZON_SELLER_ID=A1B2C3D4E5F6G7
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
AMAZON_LWA_CLIENT_ID=amzn1.application-oa2-client...
AMAZON_LWA_CLIENT_SECRET=amzn1.oa2-cs.v1...
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**What It Enables:**
- ✅ Auto-create Amazon listings
- ✅ Inventory management
- ✅ Order fulfillment
- ✅ Full automation

---

## 7. Stripe (For Payment Processing)

**Purpose:** Collect subscription payments from users

**Only needed when launching beta to users**

**Sign Up:**
1. Go to: https://stripe.com/
2. Create account
3. Get test keys first, then live keys

```bash
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🎯 RECOMMENDED SETUP ORDER

### Week 1 (Testing - Get These Now):
```bash
# CRITICAL - Already applied ✅
EBAY_APP_ID=...
EBAY_CERT_ID=...
EBAY_DEV_ID=...

# CRITICAL for dropshipping - Get today (FREE)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# OPTIONAL - Get if you want Amazon data (1000 free)
RAINFOREST_API_KEY=...
```

### Week 2 (Beta Launch):
```bash
# Email notifications (FREE)
RESEND_API_KEY=...
FROM_EMAIL=noreply@arbi.creai.dev

# Payment processing
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
```

### Week 3-4 (Automation):
```bash
# eBay auto-listing
EBAY_SELLER_ACCESS_TOKEN=...
EBAY_SELLER_REFRESH_TOKEN=...
EBAY_PAYMENT_POLICY_ID=...
EBAY_FULFILLMENT_POLICY_ID=...
EBAY_RETURN_POLICY_ID=...

# Amazon auto-listing (complex - set up when ready)
AMAZON_SP_REFRESH_TOKEN=...
AMAZON_SELLER_ID=...
# ... (8 more keys)
```

---

## 🔧 COMPLETE .ENV TEMPLATE

### For Railway (Production):

```bash
# ========== DATABASE ==========
DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway

# ========== EBAY FINDING API (CRITICAL) ==========
EBAY_APP_ID=YourAppId-YourName-PRD-abcd1234-abcd1234
EBAY_CERT_ID=PRD-abcd1234abcd1234-abcd1234
EBAY_DEV_ID=abcd1234-abcd-1234-abcd-abcd12345678

# ========== IMAGE HOSTING (CRITICAL for dropshipping) ==========
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12345

# ========== AMAZON DATA (OPTIONAL) ==========
RAINFOREST_API_KEY=abcd1234efgh5678ijkl9012mnop3456

# ========== EMAIL (Week 2) ==========
RESEND_API_KEY=re_123abc456def789ghi012jkl345mno
FROM_EMAIL=noreply@arbi.creai.dev

# ========== EBAY SELLER API (Advanced) ==========
EBAY_SELLER_ACCESS_TOKEN=v^1.1#i^1#p^3#f^0#r^1...
EBAY_SELLER_REFRESH_TOKEN=v^1.1#i^1#p^3#I^3...
EBAY_PAYMENT_POLICY_ID=123456789
EBAY_FULFILLMENT_POLICY_ID=987654321
EBAY_RETURN_POLICY_ID=456789123
EBAY_LOCATION_KEY=default_location
EBAY_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token

# ========== AMAZON SP-API (Advanced) ==========
AMAZON_SP_REFRESH_TOKEN=Atzr|IwEBIK...
AMAZON_SELLER_ID=A1B2C3D4E5F6G7
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
AMAZON_REGION=us-east-1
AMAZON_LWA_CLIENT_ID=amzn1.application-oa2-client...
AMAZON_LWA_CLIENT_SECRET=amzn1.oa2-cs.v1...
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# ========== PAYMENTS (Beta launch) ==========
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ========== OTHER ==========
NODE_ENV=production
PORT=8080
API_URL=https://arbi-production.up.railway.app
```

### For Local (apps/api/.env.local):

```bash
# Copy the same keys as above, but use test/sandbox keys where available

# Local development
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Rest same as Railway...
```

---

## 🚀 QUICK START (Get These 3 Now)

### Priority 1 (Do Today):

**Cloudinary (5 minutes):**
1. Visit https://cloudinary.com/users/register/free
2. Sign up
3. Copy Cloud Name, API Key, API Secret
4. Add to Railway variables

**What this unlocks:** Photo extraction for dropshipping

### Priority 2 (When eBay Approved):

**eBay Finding API:**
1. Check https://developer.ebay.com/my/keys
2. If approved, copy App ID, Cert ID, Dev ID
3. Add to Railway variables

**What this unlocks:** Real product scanning

### Priority 3 (Optional - This Week):

**Rainforest API (5 minutes):**
1. Visit https://www.rainforestapi.com/
2. Sign up for free 1,000 requests
3. Copy API key
4. Add to Railway variables

**What this unlocks:** Amazon price data

---

## ✅ CHECKLIST

**Today:**
- [ ] Sign up for Cloudinary (FREE)
- [ ] Add Cloudinary keys to Railway
- [ ] Check if eBay API approved
- [ ] If approved, add eBay keys to Railway

**This Week:**
- [ ] Sign up for Rainforest API (1000 free)
- [ ] Add Rainforest key to Railway
- [ ] Sign up for Resend (100 emails/day free)
- [ ] Test autonomous scanning with real data

**Next Week:**
- [ ] Set up eBay Seller API (when ready for auto-listing)
- [ ] Set up Stripe (when launching beta)

**Later:**
- [ ] Set up Amazon SP-API (advanced automation)

---

## 🎉 START HERE

**Right now, you can:**
1. Get Cloudinary keys (5 min)
2. Check eBay API approval status
3. Add both to Railway
4. Run autonomous scanner!

**Get Cloudinary now:** https://cloudinary.com/users/register/free

It's free and takes 5 minutes! 🚀
