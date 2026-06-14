# 🎯 Kalodata Integration - TikTok Shop Trend Detection

Complete integration for detecting trending products on TikTok Shop via Kalodata and automating arbitrage opportunities.

## 📋 Overview

This integration provides:

1. **KalodataScout** - Web scraper for trending TikTok Shop products
2. **VideoDownloader** - Download UGC videos and upload to Cloudinary
3. **TrendDetectionPipeline** - Automated trend → arbitrage → listing workflow
4. **API Endpoints** - REST API for accessing trend data

## 🚀 Features

### 1. Trend Detection
- Scrape trending products from Kalodata
- Extract product data (title, price, images, sales count)
- Calculate trend scores (0-100) based on multiple factors
- Identify high-margin opportunities

### 2. UGC Video Collection
- Find product videos from TikTok creators
- Download videos automatically
- Upload to Cloudinary for CDN hosting
- Generate thumbnails
- Tag videos with metadata

### 3. Automated Pipeline
- **Step 1**: Detect trending products (Kalodata)
- **Step 2**: Analyze arbitrage margin (Amazon vs eBay vs supplier)
- **Step 3**: Download UGC videos for product pages
- **Step 4**: Auto-create listings (optional)
- **Step 5**: Launch Google Ads campaigns (optional)

## 📡 API Endpoints

### GET /api/trends

Detect trending arbitrage opportunities.

**Query Parameters:**
- `minMargin` (number) - Minimum profit margin % (default: 25)
- `minTrendScore` (number) - Minimum trend score 0-100 (default: 70)
- `downloadVideos` (boolean) - Download UGC videos (default: false)

**Example Request:**
```bash
curl "https://api.arbi.creai.dev/api/trends?minMargin=30&minTrendScore=80&downloadVideos=true"
```

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "opportunities": [
    {
      "product": {
        "id": "kalo_1234567890",
        "title": "Viral LED Strip Lights - RGB Color Changing",
        "price": 29.99,
        "buyPrice": 8.50,
        "margin": 21.49,
        "marginPercent": 71.7,
        "images": ["https://..."],
        "platform": "kalodata",
        "marketplace": "tiktok"
      },
      "trendScore": 85,
      "confidence": "high",
      "estimatedProfit": 21.49,
      "reasons": [
        "Currently trending on TikTok Shop",
        "High profit margin: 71.7%",
        "Strong sales: 12,543 units sold",
        "Excellent rating: 4.8/5.0",
        "Very high trend score - act fast!"
      ],
      "videoCount": 5,
      "videoUrls": ["https://cloudinary.com/..."]
    }
  ]
}
```

### GET /api/trends/videos/:productId

Get UGC videos for a specific product.

**Query Parameters:**
- `download` (boolean) - Download videos to Cloudinary (default: false)

**Example Request:**
```bash
curl "https://api.arbi.creai.dev/api/trends/videos/kalo_1234567890?download=true"
```

**Example Response:**
```json
{
  "success": true,
  "productId": "kalo_1234567890",
  "count": 8,
  "videos": [
    {
      "url": "https://...",
      "thumbnailUrl": "https://...",
      "creatorName": "@tiktokcreator",
      "viewCount": 1234567,
      "likeCount": 98765,
      "commentCount": 543
    }
  ],
  "downloadedUrls": ["https://cloudinary.com/..."]
}
```

### POST /api/trends/schedule

Schedule automatic trend detection every X hours.

**Request Body:**
```json
{
  "intervalHours": 6,
  "minMargin": 25,
  "minTrendScore": 70
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trend detection scheduled every 6 hours"
}
```

### DELETE /api/trends/schedule

Stop scheduled trend detection.

**Response:**
```json
{
  "success": true,
  "message": "Trend detection schedule stopped"
}
```

## 🛠️ Usage Examples

### Basic Trend Detection

```typescript
import { TrendDetectionPipeline } from '@arbi/arbitrage-engine';

const pipeline = new TrendDetectionPipeline({
  minMargin: 30,           // 30% minimum profit margin
  minTrendScore: 75,       // 75/100 minimum trend score
  maxVideos: 5,            // Download up to 5 videos per product
  enableVideoDownload: true,
  autoList: false,         // Don't auto-list (safety)
});

// Execute pipeline
const opportunities = await pipeline.execute();

// Generate report
const report = pipeline.generateReport(opportunities);
console.log(report);
```

### Download Videos Only

```typescript
import { KalodataScout, VideoDownloader } from '@arbi/arbitrage-engine';

const scout = new KalodataScout();
const downloader = new VideoDownloader();

// Get product videos
const videos = await scout.getProductVideos('https://kalodata.com/product/...');

// Download to Cloudinary
const results = await downloader.downloadMultipleVideos(
  videos.map(v => ({
    url: v.url,
    metadata: {
      productId: 'product_123',
      source: 'kalodata',
      creatorName: v.creatorName,
      viewCount: v.viewCount,
    },
  })),
  3 // Max 3 concurrent downloads
);

console.log('Downloaded:', results);
```

### Scheduled Execution

```typescript
const pipeline = new TrendDetectionPipeline({
  minMargin: 25,
  minTrendScore: 70,
  enableVideoDownload: true,
});

// Run every 6 hours
const timer = pipeline.scheduleExecution(6);

// Stop after 24 hours
setTimeout(() => {
  clearInterval(timer);
}, 24 * 60 * 60 * 1000);
```

## ⚙️ Configuration

### Environment Variables

```bash
# Cloudinary (for video hosting)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Trend Score Calculation

The trend score (0-100) is calculated from:

- **Sales Volume** (30 points max)
  - 10,000+ sales = 30 points
  - 5,000-10,000 = 20 points
  - 1,000-5,000 = 10 points

- **Profit Margin** (25 points max)
  - 40%+ margin = 25 points
  - 30-40% = 20 points
  - 20-30% = 15 points

- **Trending Flag** (20 points)
  - Product marked as trending on Kalodata

- **Product Rating** (15 points max)
  - 4.5+ stars = 15 points
  - 4.0-4.5 = 10 points
  - 3.5-4.0 = 5 points

- **Price Point** (10 points)
  - $20-$100 (sweet spot) = 10 points

### Confidence Levels

- **High**: Trend score ≥ 80 AND margin ≥ 30%
- **Medium**: Trend score ≥ 60 AND margin ≥ 20%
- **Low**: Everything else

## 📊 Example Report

```
================================================================================
🎯 TREND DETECTION REPORT - 1/25/2026, 3:00:00 PM
================================================================================

📊 Summary:
   Total Opportunities: 12
   High Confidence: 5
   Medium Confidence: 4
   Low Confidence: 3

   Estimated Total Profit (per unit): $287.45

================================================================================

1. Viral LED Strip Lights - RGB Color Changing
   Trend Score: 92/100 | Confidence: HIGH
   Price: $29.99 | Margin: 71.7% | Profit: $21.49
   Videos: 8 | Platform: kalodata
   Reasons:
      - Currently trending on TikTok Shop
      - High profit margin: 71.7%
      - Strong sales: 12,543 units sold
      - Excellent rating: 4.8/5.0
      - Very high trend score - act fast!
      - Optimal price point for conversions

2. Portable Blender for Smoothies
   Trend Score: 85/100 | Confidence: HIGH
   Price: $24.99 | Margin: 68.0% | Profit: $16.99
   Videos: 6 | Platform: kalodata
   Reasons:
      - Currently trending on TikTok Shop
      - High profit margin: 68.0%
      - Strong sales: 8,921 units sold
      - Very high trend score - act fast!
      - Optimal price point for conversions

...

================================================================================
```

## ⚠️ Important Notes

### Legal & Ethical

1. **Terms of Service**: Web scraping may violate Kalodata's ToS
2. **API Preferred**: Contact Kalodata for official API access (Enterprise plan)
3. **Rate Limiting**: Current implementation has 2-second delays between requests
4. **Video Rights**: Ensure you have rights to use downloaded UGC content
5. **Attribution**: Credit original creators when using their videos

### HTML Selectors

The current implementation uses **hypothetical selectors**. You'll need to:

1. Inspect Kalodata's HTML structure
2. Update selectors in `KalodataScout.ts`:
   - `.product-card` → actual product container
   - `.product-title` → actual title element
   - `.product-price` → actual price element
   - etc.

### Cost Considerations

- **Kalodata API**: Enterprise plan (custom pricing)
- **Cloudinary**: Video hosting costs
- **Bandwidth**: Video downloads can be large
- **Storage**: Videos take up significant space

## 🔄 Workflow Integration

### Full Automation Flow

```
┌─────────────────┐
│  Kalodata       │
│  (Trending)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TrendDetection │
│  Pipeline       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Analyze        │
│  Arbitrage      │
│  Margin         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Download       │
│  UGC Videos     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create         │
│  Product        │
│  Listing        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Launch         │
│  Google Ads     │
│  Campaign       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Customer       │
│  Purchases      │
│  (Zero Capital) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-Fulfill   │
│  from Supplier  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  💰 Profit!     │
└─────────────────┘
```

## 🎯 Next Steps

1. **Inspect Kalodata** - Update HTML selectors
2. **Test API** - Try `/api/trends` endpoint
3. **Configure Cloudinary** - Set up video hosting
4. **Schedule Pipeline** - Automate trend detection
5. **Monitor Results** - Track opportunities and profits

## 📚 Related Files

- `/packages/arbitrage-engine/src/scouts/KalodataScout.ts` - Main scraper
- `/packages/arbitrage-engine/src/services/VideoDownloader.ts` - Video downloader
- `/packages/arbitrage-engine/src/pipelines/TrendDetectionPipeline.ts` - Automation pipeline
- `/apps/api/src/routes/trends.ts` - API endpoints

## 🤝 Contributing

To improve the Kalodata integration:

1. Update selectors after inspecting Kalodata's HTML
2. Add error handling for rate limiting
3. Implement proxy rotation (if needed)
4. Add more trend scoring factors
5. Integrate with listing creation system

---

**Built for Arbi** - The autonomous arbitrage platform 🚀
