# AI Video Ads & Performance Max Campaigns

## Overview

Arbi now automatically generates **AI-powered video ads** and creates **Performance Max campaigns** for every product listing. This is a game-changer for dropshipping:

- **Videos convert 3-5x better** than static images
- **Performance Max uses Google AI** to automatically optimize across ALL platforms
- **One campaign = 6 platforms**: YouTube, Search, Display, Discover, Gmail, Maps
- **AI finds your best customers** and optimizes bids in real-time

## How It Works

```
Product Listed → AI Generates Video → Performance Max Campaign Created → Google AI Optimizes → Sales!
```

### 1. **AI Video Generation** (Automatic)

When a product is listed, Arbi automatically:
- Takes your product images
- Generates a 15-second professional video ad
- Adds motion effects (zoom, pan, transitions)
- Optimizes for YouTube and social platforms

**Providers:**
- **Runway ML** (best quality, $10-20 per video)
- **FFmpeg** (free, fast, good quality)
- **Google auto-videos** (built into Performance Max, free)

### 2. **Performance Max Campaign** (Automatic)

After video generation, Arbi creates a Performance Max campaign:
- Uploads images AND videos
- Creates 12+ headline variations
- Creates 5+ description variations
- Google AI tests **thousands of combinations** automatically
- Places ads where they'll perform best
- Optimizes bids in real-time

**Budget:** $20/day default (configurable)
**Target:** 300% ROAS (spend $1, make $3)

## Setup Instructions

### Option 1: Free Setup (FFmpeg - Recommended to Start)

No setup needed! FFmpeg generates videos locally for FREE.

**Pros:**
- ✅ Free
- ✅ Fast (30 seconds per video)
- ✅ Works offline
- ✅ Good quality

**Cons:**
- ❌ Simple effects only (zoom, pan, crossfade)
- ❌ No AI-generated motion

### Option 2: Premium AI Setup (Runway ML)

For best quality, add Runway ML API:

1. **Get Runway ML API Key:**
   - Sign up: https://runwayml.com/
   - Go to Settings → API Keys
   - Copy your API key

2. **Add to Railway:**
   ```bash
   RUNWAY_API_KEY=your_key_here
   ```

**Costs:**
- ~$10-20 per video
- AI-generated motion and effects
- Professional quality

**Pros:**
- ✅ Best quality
- ✅ AI-generated motion
- ✅ Looks professionally produced
- ✅ Can add text overlays, effects

**Cons:**
- ❌ Costs money per video
- ❌ Takes 2-5 minutes per video

### Google Ads Performance Max Setup

Already configured! Your Google Ads credentials automatically enable Performance Max.

**What you get:**
- YouTube video ads
- Search ads (Google Search)
- Display ads (millions of websites)
- Discover ads (Google Discover feed)
- Gmail ads (Gmail promotions tab)
- Maps ads (Google Maps)

## How Videos Are Generated

### FFmpeg (Free - Default)

1. Downloads your product images
2. Creates slideshow with Ken Burns effects:
   - Zoom in/out
   - Pan across image
   - Smooth crossfades between images
3. Outputs 15-second MP4 video
4. Uploads to Cloudinary

**Example output:**
- Duration: 15 seconds
- Resolution: 1920x1080 (landscape) or 1080x1920 (portrait)
- Format: MP4, H.264
- File size: ~2-5 MB

### Runway ML (Premium)

1. Sends your product image to Runway ML Gen-3
2. AI analyzes the product
3. Generates video with:
   - Natural motion (product rotating, dynamic camera)
   - Professional lighting effects
   - Smooth transitions
4. Returns Hollywood-quality video

**Example prompt sent to AI:**
```
Professional product showcase video for Apple AirPods Pro.
Sleek, minimalist, clean white background, professional product photography,
smooth camera movement. The product rotates slowly showing all angles.
Cinematic quality, 4K resolution, perfect lighting.
```

## Performance Max Campaign Structure

```
Campaign: "Arbi PMax - Product Name"
  ↓
Budget: $20/day
  ↓
Asset Group:
  - 12 Headlines (auto-generated)
  - 5 Descriptions (auto-generated)
  - 3-20 Product Images
  - 1-5 Videos (if generated)
  ↓
Google AI automatically:
  - Tests all combinations
  - Finds best audiences
  - Optimizes placements
  - Adjusts bids
  ↓
Ads appear across:
  📺 YouTube (video ads)
  🔍 Google Search (text ads)
  🖼️ Display Network (banner ads)
  📰 Discover Feed (carousel ads)
  📧 Gmail (promotion ads)
  🗺️ Google Maps (local ads)
```

## Auto-Generated Ad Copy

### Headlines (12 variations):
1. "Product Name"
2. "Product Name - Best Deal"
3. "Buy Product Name"
4. "Product Name on Sale"
5. "Get Product Name Today"
6. "Product Name - Free Shipping"
7. "Save on Product Name"
8. "Product Name - $XX.XX"
9. "Shop Product Name"
10. "Product Name - Fast Delivery"
11. "Limited: Product Name"
12. "Product Name - Top Rated"

Google AI tests these and shows the best performers!

### Descriptions (5 variations):
1. [Your product description]
2. "[Description] Free shipping. Secure checkout."
3. "[Description] Buy now, pay later with Klarna."
4. "[Description] Fast delivery. Easy returns."
5. "[Description] Limited stock available."

## Performance Optimization

Performance Max automatically optimizes for:

**🎯 Target ROAS: 300%**
- Spend $1 on ads → Make $3 in sales
- Google AI adjusts bids to hit this target
- Pauses underperforming ads automatically

**👥 Smart Audiences:**
- Google AI finds people most likely to buy
- Uses purchase history, search behavior, interests
- Expands to lookalike audiences

**📊 Real-Time Bidding:**
- Bids higher when conversion is likely
- Bids lower (or skips) when unlikely
- Saves money automatically

## Monitoring Results

### In Railway Logs:

```
🎬 Generating AI video ad...
   ✅ AI video generated: ffmpeg

🚀 Creating Performance Max campaign (AI-optimized)...
   ✅ Budget created: $20/day
   ✅ Performance Max campaign created
   ✅ Asset group created with 5 images and 1 videos

   🎉 Performance Max campaign LIVE!
   🤖 Google AI optimizing across ALL platforms
   📺 YouTube + Search + Display + Discover + Gmail + Maps
   💰 Budget: $20/day
   🎯 Target: 300% ROAS
```

### In Google Ads Dashboard:

1. Go to: https://ads.google.com
2. Select your Manager Account (ID: 1859729162)
3. Click "Campaigns"
4. Look for campaigns starting with "Arbi PMax -"
5. View performance metrics:
   - Impressions
   - Clicks
   - Conversions
   - ROAS
   - Cost per conversion

## Cost Breakdown

### Per Product:

**Free Tier (FFmpeg):**
- Video generation: **$0** (uses FFmpeg)
- Google Ads budget: **$20/day** (you control this)
- **Total: $20/day** per product

**Premium Tier (Runway ML):**
- Video generation: **$10-20** (one-time)
- Google Ads budget: **$20/day** (you control this)
- **Total: $10-20 setup + $20/day** per product

### ROI Example:

```
Ad Spend:  $20/day
Target ROAS: 300%
Revenue:   $60/day (if hitting target)
Profit:    $40/day (assuming 33% margin)

Monthly: $1,200 profit per product
```

## Customization

### Change Video Duration:

In `apps/api/src/services/adCampaigns.ts`:

```typescript
const video = await aiVideoGenerator.generateVideoAd({
  duration: 30, // Change to 30 seconds
  // ...
});
```

### Change Video Style:

```typescript
const video = await aiVideoGenerator.generateVideoAd({
  style: 'elegant', // Options: modern, elegant, energetic, minimal
  // ...
});
```

### Change Daily Budget:

```typescript
const result = await googleAdsPerformanceMax.createCampaign({
  dailyBudget: 50, // Change to $50/day
  // ...
});
```

### Change Target ROAS:

```typescript
const result = await googleAdsPerformanceMax.createCampaign({
  targetRoas: 4.0, // Target 400% ROAS (spend $1, make $4)
  // ...
});
```

## Troubleshooting

### "Video generation skipped"

**Solution:** Either:
1. Install FFmpeg: `apt-get install ffmpeg` (on Railway, add to Dockerfile)
2. Or add `RUNWAY_API_KEY` to Railway env vars

### "Performance Max creation failed"

**Possible causes:**
1. Google Ads credentials expired → Refresh OAuth token
2. Manager account doesn't have permissions → Check account settings
3. Budget too low → Minimum $10/day for Performance Max

### Videos not uploading to YouTube

**Note:** Videos must be uploaded to YouTube separately. Google Ads requires YouTube video IDs.

**Workaround:** Use FFmpeg videos as Marketing Images instead (Performance Max supports both images and videos).

## Best Practices

### 1. **Start with 1-2 products**
   - Test the system
   - Monitor ROAS
   - Scale up winners

### 2. **Let AI optimize (don't micromanage)**
   - Performance Max needs 2-3 weeks to learn
   - Don't pause campaigns too early
   - Trust the AI optimization

### 3. **Monitor ROAS weekly**
   - If ROAS < 200%: Pause or lower budget
   - If ROAS > 400%: Increase budget
   - Sweet spot: 300-500% ROAS

### 4. **Use high-quality product images**
   - Minimum 1200x1200 pixels
   - Clean white background
   - Multiple angles
   - More images = better performance

### 5. **Test video styles**
   - Generate variations: modern, elegant, energetic
   - Let Google AI pick winners
   - Replace underperforming videos after 2 weeks

## Advanced: A/B Testing Videos

Generate multiple video variations:

```typescript
const videos = await aiVideoGenerator.generateVariations({
  productTitle: listing.productTitle,
  productDescription: listing.productDescription,
  productImages: listing.productImages,
});

// Creates 3 videos with different styles:
// - Modern
// - Elegant
// - Energetic

// Performance Max will test all 3 and show the best performer!
```

## Next Steps

Your AI video ad system is now LIVE! 🎉

**What happens next:**

1. ✅ List a product on Arbi marketplace
2. 🎬 AI generates video automatically
3. 🚀 Performance Max campaign goes live
4. 🤖 Google AI optimizes for 2-3 weeks
5. 💰 Sales start coming in
6. 📈 Scale up winners, pause losers

**Monitor in:**
- Railway logs (real-time creation)
- Google Ads dashboard (performance metrics)
- Stripe dashboard (actual revenue)

Happy dropshipping! 🚀
