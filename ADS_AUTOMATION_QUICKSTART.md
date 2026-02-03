# 🚀 Auto Ads Quickstart

Use this guide to run Arbi locally (or on your preferred host) and automatically create ad campaigns for your marketplace listings.

## Prerequisites
- Node.js 18+ and pnpm 8+
- Cloudinary credentials already configured in your `.env` (used for image hosting when creating listings)
- (Optional) Ad platform credentials for paid campaigns:
  - **Google Ads**: `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_REFRESH_TOKEN`
  - **Facebook/Instagram Ads**: `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_AD_ACCOUNT_ID`, `FACEBOOK_PAGE_ID`
  - **TikTok Ads**: `TIKTOK_ACCESS_TOKEN`
- Landing page base URL (used in ad creatives):
  - Set `AD_LANDING_BASE_URL` (recommended) or `PUBLIC_URL` to the domain where customers can reach your product pages (e.g., `https://your-domain.com`).
  - For local testing, use `http://localhost:3000`.

### Google Ads OAuth client (for refresh token)
Create an OAuth 2.0 client in Google Cloud Console to generate the refresh token that powers Auto Ads:

- **Application type**: Web application
- **Name**: `arbi (webclient)` (any descriptive name is fine)
- **Authorized JavaScript origins**: add `https://arbi.creai.dev` (production) and `http://localhost:3000` (local testing)
- **Authorized redirect URIs**: add `https://developers.google.com/oauthplayground` (use Google OAuth Playground to exchange the auth code for a refresh token)

> ✅ **Production note:** Auto Ads uses the refresh token in a server-to-server flow, so it’s fine to use the OAuth Playground redirect URI even when running in production (`https://arbi.creai.dev`). You don’t need to expose a redirect endpoint from your domain unless you’re building your own OAuth consent experience.

Then in OAuth Playground, click the gear icon → check **Use your own OAuth credentials**, paste your client ID/secret, authorize the Google Ads API scope, and exchange the auth code for a refresh token. Put that token into `GOOGLE_ADS_REFRESH_TOKEN`.

## Run the Arbi API
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start the API (defaults to port 3000):
   ```bash
   pnpm dev:api
   ```
   Or start a compiled build:
   ```bash
   pnpm build:api && pnpm start:api
   ```

## Create a Listing with Auto Ads
Listing a product automatically triggers ad campaign creation (Google/Facebook/TikTok when credentials are present).

```bash
curl -X POST http://localhost:3000/api/marketplace/list \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "airpods-001",
    "productTitle": "Apple AirPods Pro (2nd Gen)",
    "productDescription": "Brand new, sealed.",
    "productImageUrls": ["https://images.example.com/airpods.jpg"],
    "supplierPrice": 189.99,
    "supplierUrl": "https://target.com/sample",
    "supplierPlatform": "target",
    "markupPercentage": 30
  }'
```

Response includes the marketplace listing plus any ad campaigns that were created. Landing page links in the response use your `AD_LANDING_BASE_URL`/`PUBLIC_URL` setting.

## Fully Automated Flow (Scanning + Listing + Ads)
Start the autonomous job to find opportunities, list them, and spin up ads without manual work:

```bash
curl -X POST http://localhost:3000/api/autonomous-control/start-listing \
  -H "Content-Type: application/json" \
  -d '{
    "scanIntervalMinutes": 60,
    "minScore": 75,
    "minProfit": 20,
    "markupPercentage": 30,
    "maxListingsPerRun": 10
  }'
```

## Verify Things Are Running
- Check system status: `curl http://localhost:3000/api/autonomous-control/status`
- List active marketplace items: `curl http://localhost:3000/api/marketplace/listings`
- Confirm landing pages load at: `http://localhost:3000/product/{listingId}` (or your deployed domain)

With ads credentials set, every new listing will automatically receive ad campaigns and ready-to-share landing pages.
