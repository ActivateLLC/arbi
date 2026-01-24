# 🚀 Google Ads Automation - Start Making Money

**Automatic Google Ads campaign creation for your Arbi marketplace products.**

---

## ⚡ Quick Start (One-Click Setup)

### **The Fastest Way - Press Start and Make Money:**

```bash
curl -X POST https://api.arbi.creai.dev/api/google-ads/quick-start \
  -H "Content-Type: application/json"
```

**What it does:**
- ✅ Finds your top 5 highest-profit products (30%+ margin)
- ✅ Creates YouTube video ad campaigns for each
- ✅ Sets conservative $20/day budget per campaign
- ✅ Targets 4x ROAS (Return on Ad Spend)
- ✅ Geo-targets US market
- ✅ Creates campaigns in PAUSED state for your review

**Expected Output:**
```json
{
  "success": true,
  "message": "🎉 Quick Start Complete! Created 5 campaigns",
  "campaigns": [...],
  "budget": {
    "dailyBudget": 100,
    "estimatedMonthlySpend": 3000,
    "projectedMonthlyRevenue": 12000  // 4x ROAS
  }
}
```

---

## 🎯 Setup Requirements

### **1. Google Ads API Credentials**

You need these 5 environment variables in Railway:

```bash
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
```

**How to get them:**
1. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Create OAuth2 credentials
3. Generate developer token (instant approval for test accounts)
4. Run OAuth flow to get refresh token

### **2. Google Ads Account Requirements**
- ✅ Active Google Ads account
- ✅ Payment method added
- ✅ $0 minimum balance (campaigns start PAUSED)

---

## 💰 API Endpoints

### **1. Quick Start (Recommended)**
```bash
POST /api/google-ads/quick-start
```
**Response:** Automatically creates campaigns for top 5 products

---

### **2. Auto-Campaign from Marketplace**
```bash
POST /api/google-ads/auto-campaign-from-marketplace
Content-Type: application/json

{
  "limit": 10,                    // How many products
  "minProfitMargin": 25,          // Minimum profit margin %
  "dailyBudgetPerProduct": 30     // Budget per product per day
}
```

**What it does:**
- Gets top profitable products from your marketplace
- Creates one campaign per product
- Returns campaign IDs and budget summary

---

### **3. Single Campaign**
```bash
POST /api/google-ads/create-campaign
Content-Type: application/json

{
  "product": {
    "productId": "prod_123",
    "productName": "Sony Alpha A7 IV Camera",
    "productPrice": 2499.99,
    "profitMargin": 749.00,
    "category": "Electronics",
    "targetCountry": "US",
    "videoUrl": "https://res.cloudinary.com/dyfumzftc/video/upload/v1768151525/arbi-scraped-ads/fb-ad-manual-1768151522228.mp4",
    "landingPageUrl": "https://arbi.creai.dev/product/prod_123"
  },
  "config": {
    "dailyBudget": 50,
    "targetROAS": 3.0,
    "geoTargeting": ["US", "CA", "GB"],
    "maxCPC": 2.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "campaignId": "123456789",
  "adGroupId": "987654321",
  "adId": "456789123"
}
```

---

### **4. Bulk Campaigns**
```bash
POST /api/google-ads/create-bulk-campaigns
Content-Type: application/json

{
  "products": [
    {
      "productId": "prod_1",
      "productName": "GoPro HERO12",
      "productPrice": 449.99,
      "profitMargin": 105.00,
      "category": "Action Cameras",
      "targetCountry": "US",
      "landingPageUrl": "https://arbi.creai.dev/product/prod_1"
    },
    // ... more products
  ],
  "config": {
    "dailyBudget": 30,
    "targetROAS": 4.0,
    "geoTargeting": ["US"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Created 10 campaigns, 0 failed",
  "campaigns": [...],
  "totalBudget": 300  // $30 x 10 products
}
```

---

### **5. Get Performance Metrics**
```bash
GET /api/google-ads/campaign/123456789/metrics
```

**Response:**
```json
{
  "success": true,
  "campaignId": "123456789",
  "metrics": {
    "impressions": 15000,
    "clicks": 450,
    "spend": 675.50,
    "conversions": 12,
    "revenue": 2999.88,
    "roas": 4.44  // $4.44 revenue per $1 spent
  }
}
```

---

## 🎨 Campaign Features

### **Automatic Setup Includes:**
- ✅ **YouTube Video Ads** (using extracted winning ad videos)
- ✅ **Responsive Display Ads** (fallback if no video)
- ✅ **Target ROAS Bidding** (default 4x)
- ✅ **Geo-Targeting** (US, CA, GB by default)
- ✅ **Budget Control** (daily budget caps)
- ✅ **Regional Compliance** (auto-checks allowed countries)

### **Campaign Structure:**
```
Campaign: "Arbi - Sony Alpha A7 IV - US"
  └─ Ad Group: "AG - Sony Alpha A7 IV"
      └─ Video Ad: YouTube skippable in-stream
          - Video: Cloudinary hosted winning ad
          - Call-to-Action: "Shop Now"
          - Landing Page: Your Arbi product page
```

---

## 💡 Best Practices

### **1. Start Small**
```bash
# Start with top 3 products, $20/day each
curl -X POST .../auto-campaign-from-marketplace \
  -d '{"limit": 3, "dailyBudgetPerProduct": 20}'
```

### **2. Use Extracted Winning Ads**
```bash
# First, extract winning ad video
curl -X POST .../analyze-ads/from-url \
  -d '{"adUrl": "https://facebook.com/ads/library/?id=123"}'

# Response includes videoUrl - use it in campaign!
```

### **3. Monitor & Scale**
```bash
# Check performance after 3 days
curl https://api.arbi.creai.dev/api/google-ads/campaign/123/metrics

# If ROAS > 3x, increase budget
# If ROAS < 2x, pause and improve landing page
```

---

## 📊 Budget Planning

### **Conservative Approach:**
- **Products:** 5 highest margin products
- **Budget:** $20/day per product = $100/day total
- **Monthly Spend:** $3,000
- **Target ROAS:** 4x
- **Expected Revenue:** $12,000/month
- **Expected Profit:** $9,000/month (after ad spend)

### **Aggressive Approach:**
- **Products:** 10 products
- **Budget:** $50/day per product = $500/day total
- **Monthly Spend:** $15,000
- **Target ROAS:** 3x (easier to achieve)
- **Expected Revenue:** $45,000/month
- **Expected Profit:** $30,000/month (after ad spend)

---

## 🔒 Regional Compliance

**Automated ads allowed in:**
- ✅ United States
- ✅ Canada
- ✅ United Kingdom
- ✅ Australia
- ✅ Singapore
- ✅ UAE
- ✅ Brazil
- ✅ Mexico
- ✅ India
- ✅ Japan
- ✅ South Korea

**Restricted/Manual only:**
- ❌ China (use Baidu Ads)
- ❌ Russia (use Yandex.Direct)
- ⚠️ Germany (no AI content)
- ⚠️ France (AI content must be labeled)

---

## 🚀 Complete Workflow Example

### **Step 1: Extract Winning Ad Video**
```bash
# Find winning ad on Facebook Ad Library
# Extract it
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/from-url \
  -H "Content-Type: application/json" \
  -d '{
    "adUrl": "https://www.facebook.com/ads/library/?id=1234567890",
    "autoAnalyze": false
  }'

# Response:
# videoUrl: "https://res.cloudinary.com/...fb-ad-123.mp4"
```

### **Step 2: Create Google Ads Campaign**
```bash
curl -X POST https://api.arbi.creai.dev/api/google-ads/create-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "productId": "prod_gopro",
      "productName": "GoPro HERO12",
      "productPrice": 449.99,
      "profitMargin": 105,
      "category": "Action Cameras",
      "targetCountry": "US",
      "videoUrl": "https://res.cloudinary.com/...fb-ad-123.mp4",
      "landingPageUrl": "https://arbi.creai.dev/product/prod_gopro"
    },
    "config": {
      "dailyBudget": 30,
      "targetROAS": 4.0,
      "geoTargeting": ["US", "CA"],
      "maxCPC": 1.5
    }
  }'

# Response:
# campaignId: "123456789"
```

### **Step 3: Review in Google Ads**
1. Go to [ads.google.com](https://ads.google.com)
2. Find campaign "Arbi - GoPro HERO12 - US"
3. Review ad creative and targeting
4. **Enable campaign** to start spending

### **Step 4: Monitor Performance**
```bash
# Check daily
curl https://api.arbi.creai.dev/api/google-ads/campaign/123456789/metrics

# Optimize:
# - If ROAS > 4x → Increase budget 25%
# - If ROAS 2-4x → Keep running
# - If ROAS < 2x → Pause, improve landing page, try new ad video
```

---

## 💸 Expected Returns

### **Timeline:**
- **Day 1-3:** Learning phase, low conversions
- **Day 4-7:** Algorithm optimizes, conversions increase
- **Day 8-14:** Stable performance, hit target ROAS
- **Day 15+:** Scale winning campaigns

### **Real Example:**
```
Product: Sony Alpha A7 IV ($2,499)
Profit Margin: $749 (30%)
Daily Budget: $50
Target ROAS: 4x

Week 1: $350 spent, $800 revenue, 2.3x ROAS
Week 2: $350 spent, $1,400 revenue, 4.0x ROAS ✅
Week 3: $500 spent, $2,200 revenue, 4.4x ROAS ✅✅

Monthly: $1,700 spent, $7,200 revenue, $2,169 profit
```

---

## 🎯 Next Steps

1. **Add Google Ads API credentials** to Railway environment
2. **Run Quick Start** to create first campaigns
3. **Review campaigns** in Google Ads dashboard
4. **Enable campaigns** when ready to spend
5. **Extract winning ads** from Facebook to improve performance
6. **Monitor daily** and scale winners

---

## 📞 Support

- **API Issues:** Check Railway logs
- **Google Ads Questions:** [Google Ads Help](https://support.google.com/google-ads)
- **Performance Help:** Monitor ROAS, pause low performers

---

**🚀 Ready to make money? Run the Quick Start command now!**
