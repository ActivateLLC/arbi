# Custom Domain Strategy for Arbi Dropshipping Platform

## Current Setup (What You Have Now)

- **Frontend**: `www.arbi.creai.dev` (Vercel) - Your main website
- **API/Products**: `arbi-production.up.railway.app` (Railway) - Backend + product pages
- **Product links**: `https://arbi-production.up.railway.app/product/listing_xxx`

## Goal

- Clean, professional domains for Google Ads and customer-facing product pages
- Separate API domain from main website
- Everything working together seamlessly

---

## ✅ RECOMMENDED: Option A - Subdomain Strategy (Simplest)

### DNS Setup:
```
www.arbi.creai.dev     →  Vercel   (Frontend/marketing site)
api.arbi.creai.dev     →  Railway  (API + product pages)
```

### What Goes Where:
- **Vercel** (`www.arbi.creai.dev`): Your main website, marketing pages, about us, etc.
- **Railway** (`api.arbi.creai.dev`): API endpoints + product landing pages + checkout

### Product URLs:
```
https://api.arbi.creai.dev/product/listing_1766187610956_y139ixto3
https://api.arbi.creai.dev/product/listing_1766187618650_2fr9gwt7d
```

### API Endpoints:
```
https://api.arbi.creai.dev/api/marketplace/listings
https://api.arbi.creai.dev/api/marketplace/list
https://api.arbi.creai.dev/health
```

### ✅ Pros:
- **Simplest to set up** - Just one CNAME record
- **Fastest** - No proxying or redirects
- **Railway handles everything** - Product pages and API on same server
- **Clean separation** - Marketing site vs transaction site
- **Google Ads ready** - Direct links to product pages

### ⚠️ Cons:
- Product URLs have "api" subdomain (minor aesthetic issue)

---

## Implementation Steps for Option A

### Step 1: Configure DNS (In Your Domain Registrar)

Add CNAME record:
```
Type:  CNAME
Name:  api
Value: arbi-production.up.railway.app
TTL:   Auto or 3600
```

**Note**: Some DNS providers (like Cloudflare) may show it as:
```
api.arbi.creai.dev  →  arbi-production.up.railway.app
```

### Step 2: Configure Railway

1. Go to Railway dashboard → Your project
2. Click on Settings → Domains
3. Add custom domain: `api.arbi.creai.dev`
4. Railway will verify DNS and provision SSL certificate (takes 1-5 minutes)

### Step 3: Update Environment Variables in Railway

Add this variable:
```
PUBLIC_URL=https://api.arbi.creai.dev
```

This ensures all generated links use your custom domain.

### Step 4: Update Google Ads Console (If Configured)

Update these URLs in Google Ads:
- **Final URL**: `https://api.arbi.creai.dev/product/{listing_id}`
- **Display URL**: `api.arbi.creai.dev`
- **Tracking template**: (if used) Update domain

### Step 5: Test Everything

After DNS propagates (5-60 minutes):

```bash
# Test DNS resolution
nslookup api.arbi.creai.dev

# Test product page
curl https://api.arbi.creai.dev/product/listing_1766187610956_y139ixto3

# Test health check
curl https://api.arbi.creai.dev/health
```

---

## Alternative: Option B - Root Domain for Products

### DNS Setup:
```
arbi.creai.dev         →  Railway  (Product pages + API)
www.arbi.creai.dev     →  Vercel   (Frontend - redirects to arbi.creai.dev)
```

### Product URLs:
```
https://arbi.creai.dev/product/listing_xxx
https://arbi.creai.dev/api/marketplace/listings
```

### ✅ Pros:
- **Cleanest product URLs** - No subdomain at all
- **Professional appearance** - Main domain for transactions

### ⚠️ Cons:
- **More complex** - Root domain setup requires A records or ALIAS
- **Conflicts with Vercel** - You'd need to move frontend or use subdomain
- **DNS complexity** - Some providers don't support CNAME on root

---

## Alternative: Option C - Vercel Proxy (Advanced)

Keep everything on one domain by proxying through Vercel:

### DNS Setup:
```
arbi.creai.dev         →  Vercel   (Frontend + proxy)
```

### Vercel Configuration (`vercel.json`):
```json
{
  "rewrites": [
    {
      "source": "/product/:path*",
      "destination": "https://arbi-production.up.railway.app/product/:path*"
    },
    {
      "source": "/api/:path*",
      "destination": "https://arbi-production.up.railway.app/api/:path*"
    }
  ]
}
```

### Product URLs:
```
https://arbi.creai.dev/product/listing_xxx
```

### ✅ Pros:
- **Perfect URLs** - Everything on main domain
- **Centralized** - One domain to manage

### ⚠️ Cons:
- **Extra latency** - Every request goes through Vercel first
- **More complex** - Requires Vercel configuration
- **Debugging harder** - Adds another layer

---

## 🎯 Final Recommendation

**Go with Option A** (`api.arbi.creai.dev` on Railway)

### Why:
1. **Fastest to implement** - 10 minutes total
2. **Most reliable** - Direct connection to Railway
3. **Easiest to debug** - No proxies or redirects
4. **Standard practice** - Many companies use `api.` subdomain (Stripe, Twitter, GitHub)
5. **Google Ads works perfectly** - Clean, fast product links

### What Users See:
```
Marketing: www.arbi.creai.dev (Vercel)
           ↓
Product Ad: Click
           ↓
Landing:   api.arbi.creai.dev/product/listing_xxx (Railway)
           ↓
Checkout:  Stripe hosted page
           ↓
Success:   api.arbi.creai.dev/product/listing_xxx/success
```

The "api" subdomain is **completely normal** - users won't care or notice. What matters is:
- ✅ SSL certificate (https)
- ✅ Fast loading
- ✅ Professional appearance
- ✅ Working checkout

---

## Need Help?

If you choose Option A, here's exactly what to do:

1. **DNS**: Add CNAME `api` → `arbi-production.up.railway.app`
2. **Railway**: Add custom domain `api.arbi.creai.dev`
3. **Railway**: Add env var `PUBLIC_URL=https://api.arbi.creai.dev`
4. **Wait**: 5-60 minutes for DNS + SSL
5. **Test**: Visit `https://api.arbi.creai.dev/health`
6. **Recreate products**: Run `create-all-listings.sh` to generate new links with custom domain

Done! 🎉
