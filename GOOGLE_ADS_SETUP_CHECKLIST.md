# ✅ Google Ads API Setup Checklist

Quick reference for setting up Google Ads API integration for Arbi backend.

---

## Prerequisites
- [ ] Google Account
- [ ] Google Ads Account (sign up at ads.google.com)
- [ ] Google Ads Manager Account (required for production API access)
- [ ] Access to Railway deployment

---

## Step 1: Google Cloud Console Setup (15 minutes)

**URL**: https://console.cloud.google.com/

- [ ] Create new project or select existing project
- [ ] Enable "Google Ads API" for the project
  - Go to APIs & Services → Library
  - Search "Google Ads API"
  - Click Enable

---

## Step 2: Create OAuth2 Credentials (5 minutes)

**URL**: https://console.cloud.google.com/apis/credentials

- [ ] Go to "APIs & Services" → "Credentials"
- [ ] Click "+ CREATE CREDENTIALS" → "OAuth client ID"
- [ ] Configure OAuth consent screen if prompted
- [ ] Application type: Select "Web application"
- [ ] Name: "Arbi Backend"
- [ ] Authorized redirect URIs: Add `https://developers.google.com/oauthplayground` (for testing)
- [ ] Click "Create"
- [ ] **Copy and save**:
  - [ ] **Client ID** → Save as `GOOGLE_ADS_CLIENT_ID`
  - [ ] **Client Secret** → Save as `GOOGLE_ADS_CLIENT_SECRET`

---

## Step 3: Get Developer Token (10-48 hours)

**URL**: https://ads.google.com/aw/apicenter

- [ ] Sign in to Google Ads Manager account
- [ ] Navigate to: Tools & Settings → Setup → API Center
- [ ] Click "Apply for API Access" (if not already approved)
- [ ] Fill out application form
- [ ] Wait for approval (test access may be immediate, production takes 24-48 hours)
- [ ] Once approved, **copy Developer Token**
- [ ] **Save as**: `GOOGLE_ADS_DEVELOPER_TOKEN`

---

## Step 4: Get Customer ID (2 minutes)

**URL**: https://ads.google.com/

- [ ] Log into Google Ads account
- [ ] Look at top right corner of dashboard
- [ ] Find Customer ID (format: `123-456-7890`)
- [ ] **Remove hyphens**: `1234567890`
- [ ] **Save as**: `GOOGLE_ADS_CUSTOMER_ID`

---

## Step 5: Generate Refresh Token (5 minutes)

**URL**: https://developers.google.com/oauthplayground/

- [ ] Go to OAuth2 Playground
- [ ] Click ⚙️ (settings icon) in top right
- [ ] Check ✅ "Use your own OAuth credentials"
- [ ] Enter:
  - [ ] OAuth Client ID: `[Your GOOGLE_ADS_CLIENT_ID]`
  - [ ] OAuth Client secret: `[Your GOOGLE_ADS_CLIENT_SECRET]`
- [ ] Close settings

**In Step 1 (Select & authorize APIs):**
- [ ] Scroll down or search for "Google Ads API"
- [ ] Expand it and select: `https://www.googleapis.com/auth/adwords`
- [ ] Click "Authorize APIs"
- [ ] Sign in with Google account that has Google Ads access
- [ ] Click "Allow" to grant permissions

**In Step 2 (Exchange authorization code for tokens):**
- [ ] Click "Exchange authorization code for tokens"
- [ ] **Copy the "Refresh token"**
- [ ] **Save as**: `GOOGLE_ADS_REFRESH_TOKEN`

---

## Step 6: Add to Railway (5 minutes)

**URL**: https://railway.app/

### Option A: Railway Dashboard
- [ ] Go to your Railway project
- [ ] Click "Variables" tab
- [ ] Add each variable:
  ```
  GOOGLE_ADS_CLIENT_ID = [your client id]
  GOOGLE_ADS_CLIENT_SECRET = [your client secret]
  GOOGLE_ADS_DEVELOPER_TOKEN = [your developer token]
  GOOGLE_ADS_CUSTOMER_ID = [your customer id without hyphens]
  GOOGLE_ADS_REFRESH_TOKEN = [your refresh token]
  ```
- [ ] Click "Add" for each

### Option B: Railway CLI
```bash
railway variables set GOOGLE_ADS_CLIENT_ID="your_value"
railway variables set GOOGLE_ADS_CLIENT_SECRET="your_value"
railway variables set GOOGLE_ADS_DEVELOPER_TOKEN="your_value"
railway variables set GOOGLE_ADS_CUSTOMER_ID="your_value"
railway variables set GOOGLE_ADS_REFRESH_TOKEN="your_value"
```

---

## Step 7: Deploy & Test (5 minutes)

- [ ] Trigger Railway redeploy (or wait for automatic deploy)
- [ ] Wait for deployment to complete
- [ ] Test the API:

```bash
curl -X POST https://arbi.cream.dev/api/marketplace/list \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "test_001",
    "productTitle": "Test Product - Apple AirPods Pro",
    "productDescription": "High-quality Apple AirPods Pro",
    "productImageUrls": ["https://via.placeholder.com/400"],
    "supplierPrice": 199.99,
    "supplierUrl": "https://example.com/product",
    "supplierPlatform": "amazon",
    "markupPercentage": 30
  }'
```

**Check Response:**
- [ ] Response includes `"adInfo"` object (not null)
- [ ] Response includes `"totalCampaigns": 1` or more
- [ ] Message says "ad campaign started"

**Check Railway Logs:**
- [ ] Look for: `✅ Google Ad created: google_...`
- [ ] Should NOT see: `⚠️ Google Ads not configured`

**Check Google Ads Dashboard:**
- [ ] Go to your Google Ads account
- [ ] Navigate to Campaigns
- [ ] Look for new campaign named "Arbi - Test Product..."
- [ ] Campaign should be active

---

## Verification Checklist

### Environment Variables Set
- [ ] GOOGLE_ADS_CLIENT_ID
- [ ] GOOGLE_ADS_CLIENT_SECRET
- [ ] GOOGLE_ADS_DEVELOPER_TOKEN
- [ ] GOOGLE_ADS_CUSTOMER_ID
- [ ] GOOGLE_ADS_REFRESH_TOKEN

### System Behavior
- [ ] Can create marketplace listings
- [ ] Listings trigger ad campaign creation
- [ ] Ads appear in Google Ads dashboard
- [ ] No error logs about missing Google Ads config

### API Response
- [ ] `adInfo` is not null
- [ ] Contains campaign details
- [ ] Success message includes "ad campaign"

---

## Troubleshooting

### "Google Ads not configured" in logs
- ❌ Missing `GOOGLE_ADS_CLIENT_ID` or `GOOGLE_ADS_DEVELOPER_TOKEN`
- ✅ Add both variables and redeploy

### "OAuth2 authorization failed"
- ❌ Incorrect Client ID/Secret or refresh token
- ✅ Regenerate refresh token using OAuth Playground

### "Developer token invalid"
- ❌ Token not approved or incorrect
- ✅ Check API Center for approval status
- ✅ Ensure using Manager account token

### "Customer ID not found"
- ❌ Incorrect format (has hyphens) or wrong ID
- ✅ Remove all hyphens
- ✅ Verify ID from Google Ads dashboard

### Campaigns not appearing in Google Ads
- ❌ Using test developer token
- ✅ Apply for production access
- ✅ Ensure billing is set up in Google Ads

---

## Important Notes

⚠️ **Developer Token Access Levels**:
- **Test Access**: Limited requests, campaigns marked as "test"
- **Basic Access**: 15,000 operations/day
- **Standard Access**: 150,000 operations/day (requires $10k spend in 90 days)

⚠️ **Billing**:
- API access is free
- Ad spend is charged normally through Google Ads
- Set daily/monthly budgets in Google Ads to control costs

⚠️ **Security**:
- Never commit API keys to repository
- Use environment variables only
- Rotate refresh tokens periodically
- Monitor API usage for suspicious activity

---

## Estimated Time
- **First-time setup**: 45-60 minutes (+ 24-48 hours for production token approval)
- **With existing credentials**: 10-15 minutes

---

## Success! 🎉

Once all steps are complete:
✅ Your backend automatically creates Google Ads for every product listing  
✅ Ads drive traffic to your marketplace  
✅ More visitors = more sales = more profit  
✅ Zero manual effort required  

---

## Need Help?

- **Google Ads API Docs**: https://developers.google.com/google-ads/api/docs/start
- **OAuth Guide**: https://developers.google.com/google-ads/api/docs/oauth/overview
- **API Center**: https://ads.google.com/aw/apicenter
- **Railway Support**: https://railway.app/help

---

**File**: `GOOGLE_ADS_SETUP_CHECKLIST.md`  
**Related**: `MISSING_GOOGLE_ADS_API_KEYS.md` (detailed explanations)
