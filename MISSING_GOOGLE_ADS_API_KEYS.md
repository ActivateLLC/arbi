# 🔑 Missing Google Ads API Keys - Complete List

## Summary
Your Arbi backend has Google Ads integration built-in, but **all 5 required API keys are missing**. The system will function without them, but automated ad campaign creation for marketplace listings will not work.

## ⚠️ Backend Access Issue
**Note**: Could not test live API at `arbi.cream.dev` (possible typo - code shows `arbi.creai.dev`) or `arbi-production.up.railway.app` due to DNS/connectivity issues. This analysis is based on code inspection.

---

## 🎯 Required Google Ads API Keys (5 Total)

### 1. GOOGLE_ADS_CLIENT_ID ❌
**What it is**: OAuth2 Client ID that identifies your app to Google  
**Where to get it**: [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)  
**Steps**:
1. Create or select a Google Cloud project
2. Go to "APIs & Services" → "Credentials"
3. Click "Create Credentials" → "OAuth client ID"
4. Application type: "Web application"
5. Add authorized redirect URIs
6. Copy the Client ID

**Format**: `123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`

---

### 2. GOOGLE_ADS_CLIENT_SECRET ❌
**What it is**: Secret key that pairs with Client ID for authentication  
**Where to get it**: Generated automatically with OAuth Client ID  
**Steps**:
1. Same process as Client ID above
2. Secret is shown when you create the OAuth client
3. Download JSON or copy the secret

**Format**: `GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx`  
**⚠️ Security**: Keep this secret! Never commit to repository.

---

### 3. GOOGLE_ADS_DEVELOPER_TOKEN ❌
**What it is**: API access token that identifies your Google Ads API access level  
**Where to get it**: [Google Ads API Center](https://ads.google.com/aw/apicenter)  
**Steps**:
1. Sign in to your Google Ads Manager account
2. Navigate to Tools & Settings → Setup → API Center
3. Apply for API access (may require approval from Google)
4. Once approved, your developer token will appear
5. Copy the token

**Format**: `ABcdEfGh1234567890`  
**⚠️ Note**: Requires a Google Ads Manager Account (not regular account) for production use. Test access may be available immediately.

---

### 4. GOOGLE_ADS_CUSTOMER_ID ❌
**What it is**: Your Google Ads account ID  
**Where to get it**: Top right corner of Google Ads dashboard  
**Steps**:
1. Log into your Google Ads account
2. Look at the top right corner
3. You'll see a number like `123-456-7890`
4. Use it **without hyphens**: `1234567890`

**Format**: 10-digit number without hyphens (e.g., `1234567890`)  
**⚠️ Important**: Remove all hyphens when adding to environment variables.

---

### 5. GOOGLE_ADS_REFRESH_TOKEN ❌
**What it is**: OAuth2 refresh token for long-term API access without repeated login  
**Where to get it**: Generated through OAuth2 flow  
**Steps**:

**Option A: OAuth2 Playground (Quick & Easy)**
1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click settings (⚙️) → Check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In "Step 1", find and select "Google Ads API" scope: `https://www.googleapis.com/auth/adwords`
5. Click "Authorize APIs"
6. Sign in with Google account that has access to your Google Ads
7. In "Step 2", click "Exchange authorization code for tokens"
8. Copy the "Refresh token"

**Option B: Custom Implementation**
- Use `google-auth-library` npm package
- Implement OAuth2 flow in your app
- User grants permissions, you receive refresh token

**Format**: `1//0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP`  
**⚠️ Security**: This token allows long-term API access. Keep it secure!

---

## 🚀 How to Add Keys to Railway

Once you have all 5 keys:

```bash
# Option 1: Railway Dashboard
1. Go to Railway dashboard
2. Select your project
3. Go to Variables tab
4. Add each key:
   - GOOGLE_ADS_CLIENT_ID=your_value
   - GOOGLE_ADS_CLIENT_SECRET=your_value
   - GOOGLE_ADS_DEVELOPER_TOKEN=your_value
   - GOOGLE_ADS_CUSTOMER_ID=your_value
   - GOOGLE_ADS_REFRESH_TOKEN=your_value
5. Redeploy

# Option 2: Railway CLI
railway variables set GOOGLE_ADS_CLIENT_ID="your_value"
railway variables set GOOGLE_ADS_CLIENT_SECRET="your_value"
railway variables set GOOGLE_ADS_DEVELOPER_TOKEN="your_value"
railway variables set GOOGLE_ADS_CUSTOMER_ID="your_value"
railway variables set GOOGLE_ADS_REFRESH_TOKEN="your_value"
```

---

## 🧪 How to Test

Once keys are added and deployed:

```bash
# Test marketplace listing (should trigger Google Ads creation)
curl -X POST https://arbi.cream.dev/api/marketplace/list \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "test_001",
    "productTitle": "Apple AirPods Pro",
    "productDescription": "Brand new AirPods Pro with noise cancellation",
    "productImageUrls": ["https://example.com/airpods.jpg"],
    "supplierPrice": 199.99,
    "supplierUrl": "https://example.com/product",
    "supplierPlatform": "amazon",
    "markupPercentage": 30
  }'
```

**Success Response** (with Google Ads configured):
```json
{
  "success": true,
  "listing": { ... },
  "adInfo": {
    "campaigns": [
      {
        "campaignId": "google_...",
        "platform": "google",
        "status": "active"
      }
    ],
    "totalCampaigns": 1
  },
  "message": "Product listed on marketplace and ad campaign started"
}
```

**Without Keys**:
```json
{
  "success": true,
  "listing": { ... },
  "adInfo": null,
  "message": "Product listed on marketplace"
}
```

Check Railway logs for:
- ✅ With keys: `✅ Google Ad created: google_...`
- ❌ Without keys: `⚠️ Google Ads not configured (set GOOGLE_ADS_CLIENT_ID)`

---

## 📚 Official Documentation

- **Google Ads API Getting Started**: https://developers.google.com/google-ads/api/docs/start
- **OAuth2 Setup Guide**: https://developers.google.com/google-ads/api/docs/oauth/overview
- **API Center**: https://ads.google.com/aw/apicenter
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- **OAuth Playground**: https://developers.google.com/oauthplayground/

---

## 💡 What Happens Without These Keys?

### System Behavior:
- ✅ Backend functions normally
- ✅ Can list products on marketplace
- ✅ Can accept orders and process payments
- ❌ **Cannot create Google Ads campaigns automatically**
- ❌ No automated traffic generation
- ❌ Manual marketing required

### With Keys Configured:
- ✅ Products listed → Ads created automatically
- ✅ Google Shopping/Display ads go live instantly
- ✅ Automated traffic to product listings
- ✅ Higher conversion rates through paid advertising
- ✅ Hands-free marketing automation

---

## 🔍 Code Location

The Google Ads integration is in:
- **File**: `/apps/api/src/services/adCampaigns.ts`
- **Lines**: 56-162 (Google Ads specific code)
- **Triggered by**: `POST /api/marketplace/list` endpoint

The system checks for keys on lines 56-66:
```typescript
if (process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
  // Attempt to create Google Ads campaign
} else {
  console.log(`⚠️ Google Ads not configured (set GOOGLE_ADS_CLIENT_ID)`);
}
```

---

## 🎁 Bonus: Other Missing API Keys

While analyzing for Google Ads, I found these other ad platforms are also not configured:

### Facebook/Instagram Ads
- `FACEBOOK_ACCESS_TOKEN`
- `FACEBOOK_AD_ACCOUNT_ID`
- `FACEBOOK_PAGE_ID`

### TikTok Ads
- `TIKTOK_ACCESS_TOKEN`

These are optional but would enable multi-platform ad campaigns.

---

## ❓ Need Help?

1. **Google Ads API Access**: Can take 24-48 hours for approval
2. **Test Mode**: You can use test credentials while waiting for production approval
3. **OAuth Flow**: Use OAuth2 Playground for easiest refresh token generation
4. **Customer ID**: Must be from a Google Ads account with ad spend history

---

**Next Steps**:
1. ✅ Fix DNS/deployment access issues (domains not resolving)
2. ✅ Create Google Cloud project and enable Google Ads API
3. ✅ Generate all 5 API keys following instructions above
4. ✅ Add to Railway environment variables
5. ✅ Redeploy and test with marketplace listing
6. ✅ Verify ads are created in your Google Ads dashboard

Good luck! 🚀
