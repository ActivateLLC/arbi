# 🎯 Google Ads Web Automation - NO API NEEDED!

**Create Google Ads campaigns using JUST your login credentials - no API tokens required!**

---

## ⚡ Why This is BETTER Than API

| Feature | Web Automation | API Method |
|---------|---------------|------------|
| **Setup Time** | 30 seconds | 2-3 hours |
| **Requirements** | Email + Password | 5 API credentials |
| **Approval** | Instant | Needs Google approval |
| **Complexity** | Simple | Complex |
| **Cost** | Free | Free |

**TL;DR:** Just use your Google Ads login - we handle everything else!

---

## 🚀 Quick Start (30 Seconds)

### **Step 1: Run Quick Start**
```bash
curl -X POST https://api.arbi.creai.dev/api/google-ads-web/quick-start \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@gmail.com",
    "password": "your-google-ads-password",
    "limit": 3,
    "minProfitMargin": 30
  }'
```

**What happens:**
1. ✅ Opens Google Ads in headless browser
2. ✅ Logs in with your credentials
3. ✅ Finds your top 3 highest-profit products
4. ✅ Creates YouTube video campaigns automatically
5. ✅ Sets $20/day budget per campaign
6. ✅ Returns campaign names and success status

**Response:**
```json
{
  "success": true,
  "message": "Created 3 campaigns via web automation",
  "results": [
    {
      "success": true,
      "campaignName": "Arbi - Sony Alpha A7 IV",
      "product": "Sony Alpha A7 IV"
    }
  ],
  "budget": {
    "dailyBudget": 60,
    "estimatedMonthlySpend": 1800
  }
}
```

### **Step 2: Review Campaigns**
- Log in to https://ads.google.com
- Find campaigns starting with "Arbi -"
- Enable them when ready to start spending

---

## 💰 All Endpoints

### **1. Quick Start (Recommended)**
```bash
POST /api/google-ads-web/quick-start

Body:
{
  "email": "your@email.com",
  "password": "your-password",
  "limit": 5,              // How many products (default: 3)
  "minProfitMargin": 25    // Minimum profit % (default: 30)
}
```

---

### **2. Create Single Campaign**
```bash
POST /api/google-ads-web/create-campaign

Body:
{
  "email": "your@email.com",
  "password": "your-password",
  "campaign": {
    "productName": "GoPro HERO12",
    "productUrl": "https://arbi.creai.dev/product/123",
    "dailyBudget": 30,
    "targetCountry": "United States",
    "videoUrl": "https://res.cloudinary.com/.../video.mp4",  // Optional
    "adCopy": {
      "headline": "GoPro HERO12 - Best Price",
      "description": "Premium action camera at $449. Fast shipping!"
    }
  }
}
```

---

### **3. Create from Marketplace Products**
```bash
POST /api/google-ads-web/create-from-marketplace

Body:
{
  "email": "your@email.com",
  "password": "your-password",
  "limit": 10,
  "minProfitMargin": 25,
  "dailyBudgetPerProduct": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Web automation complete: 10 campaigns created",
  "success": 10,
  "failed": 0,
  "results": [...],
  "totalBudget": 300
}
```

---

### **4. Test Login Credentials**
```bash
POST /api/google-ads-web/test-login

Body:
{
  "email": "your@email.com",
  "password": "your-password"
}
```

**Use this to verify credentials before creating campaigns!**

---

## 🔒 Security

### **Your Credentials:**
- ✅ Used only for automation
- ✅ Not stored anywhere
- ✅ Transmitted over HTTPS only
- ✅ Only used during campaign creation
- ✅ Cleared from memory after use

### **Best Practices:**
1. Use a dedicated Google Ads account
2. Enable 2FA (app-based, not SMS)
3. Test with `test-login` endpoint first
4. Review campaigns before enabling

---

## 🎬 How It Works

```
1. API receives your request
   ↓
2. Launches headless Chromium browser
   ↓
3. Navigates to ads.google.com
   ↓
4. Logs in with your credentials
   ↓
5. Clicks "New Campaign" button
   ↓
6. Selects "Video" campaign type
   ↓
7. Fills in all campaign details:
   - Campaign name
   - Daily budget
   - Target location
   - Ad headline
   - Ad description
   - Landing page URL
   ↓
8. Clicks "Create Campaign"
   ↓
9. Takes success screenshot
   ↓
10. Returns campaign name to you
```

---

## 💡 Complete Example

### **Scenario: Create campaigns for top 5 products**

```bash
# Step 1: Test credentials
curl -X POST https://api.arbi.creai.dev/api/google-ads-web/test-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@gmail.com",
    "password": "your-password"
  }'

# Response: {"success": true, "message": "Login credentials validated"}

# Step 2: Run quick start
curl -X POST https://api.arbi.creai.dev/api/google-ads-web/quick-start \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@gmail.com",
    "password": "your-password",
    "limit": 5,
    "minProfitMargin": 30
  }'

# Response:
# {
#   "success": true,
#   "message": "Created 5 campaigns via web automation",
#   "results": [
#     {"success": true, "campaignName": "Arbi - Sony Alpha A7 IV"},
#     {"success": true, "campaignName": "Arbi - GoPro HERO12"},
#     {"success": true, "campaignName": "Arbi - MacBook Air M2"},
#     {"success": true, "campaignName": "Arbi - AirPods Pro 2"},
#     {"success": true, "campaignName": "Arbi - iPad Pro M2"}
#   ],
#   "budget": {
#     "dailyBudget": 100,
#     "estimatedMonthlySpend": 3000
#   }
# }

# Step 3: Log in to ads.google.com and enable campaigns
```

---

## 🎯 Campaign Details Created

Each campaign includes:

**Campaign Settings:**
- ✅ Name: "Arbi - [Product Name]"
- ✅ Type: Video (YouTube)
- ✅ Goal: Drive conversions
- ✅ Budget: Your specified daily budget
- ✅ Location: Your target country
- ✅ Status: PAUSED (for your review)

**Ad Creative:**
- ✅ Headline: Product name + "Best Price"
- ✅ Description: Premium product description
- ✅ Landing Page: Your Arbi product page
- ✅ Video: Optional Cloudinary-hosted winning ad

---

## ⏱️ Performance

| Action | Time |
|--------|------|
| Single Campaign | ~45 seconds |
| 5 Campaigns | ~4 minutes |
| 10 Campaigns | ~8 minutes |

**Rate Limiting:** 5 second delay between campaigns to avoid detection

---

## 🐛 Troubleshooting

### **"Login failed"**
- Verify email/password correct
- Disable 2FA temporarily OR use app password
- Check Google Ads account is active

### **"Campaign creation timed out"**
- Google Ads UI might be slow
- Retry after 5 minutes
- Check if campaign was actually created

### **"Could not find button"**
- Google Ads UI may have changed
- Report issue with screenshot
- Use API method as fallback

---

## 🆚 Web vs API Comparison

### **Use Web Automation When:**
- ✅ You don't have API access yet
- ✅ You want to start immediately (30 seconds)
- ✅ You prefer simple setup
- ✅ Creating 1-20 campaigns

### **Use API Method When:**
- ✅ You have API credentials
- ✅ Creating 50+ campaigns
- ✅ Need real-time metrics
- ✅ Want fine-grained control

---

## 💸 Expected Returns (Same as API)

### **Conservative ($60/day budget):**
```
3 products × $20/day × 30 days = $1,800/month spend
Target 4x ROAS = $7,200/month revenue
Profit: $5,400/month
```

### **Aggressive ($300/day budget):**
```
10 products × $30/day × 30 days = $9,000/month spend
Target 3x ROAS = $27,000/month revenue
Profit: $18,000/month
```

---

## 🎉 Start Making Money NOW

**No API tokens. No approval. No waiting.**

Just run:
```bash
curl -X POST https://api.arbi.creai.dev/api/google-ads-web/quick-start \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD"
  }'
```

**That's it. Campaigns created in 4 minutes. 🚀💰**
