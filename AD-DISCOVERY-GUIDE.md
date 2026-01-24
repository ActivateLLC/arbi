# 🎯 Automated Ad Discovery & Extraction Guide

## What This System Does

**Fully automated system that finds and extracts winning video ads from Facebook Ad Library for your Arbi products.**

No more manual searching - the system does everything:
1. Searches Facebook Ad Library automatically
2. Finds ads from big brands (Apple, Sony, GoPro, Samsung, etc.)
3. Prioritizes long-running ads (30+ days = proven winners)
4. Extracts videos and hosts on Cloudinary
5. Returns ready-to-study video URLs

---

## Quick Start - 3 Ways to Use

### Option 1: Auto-Discover & Extract (RECOMMENDED)
**One command finds AND extracts videos automatically:**

```bash
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/discover-and-extract \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerm": "action camera",
    "maxExtract": 5
  }'
```

**Returns:**
```json
{
  "success": true,
  "searchTerm": "action camera",
  "totalDiscovered": 8,
  "totalExtracted": 5,
  "ads": [
    {
      "advertiser": "GoPro",
      "adText": "Capture life's adventures...",
      "originalUrl": "https://www.facebook.com/ads/library/?id=...",
      "videoUrl": "https://res.cloudinary.com/.../discovered-gopro.mp4",
      "platform": ["facebook", "instagram"]
    },
    // ... more ads
  ]
}
```

### Option 2: Discovery Only (Find URLs)
**Just find ads without extracting:**

```bash
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/discover \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerm": "wireless earbuds",
    "limit": 10
  }'
```

**Returns:** List of ad URLs to review before extracting.

### Option 3: Bulk Discovery (Multiple Products)
**Find ads for all your products at once:**

```bash
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/discover-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      "sony mirrorless camera",
      "gopro action camera",
      "macbook laptop",
      "airpods wireless earbuds",
      "dyson vacuum"
    ],
    "limit": 5
  }'
```

---

## Best Search Terms for Your Products

| Arbi Product | Best Search Term | Why |
|--------------|------------------|-----|
| Sony Alpha A7 IV | `"mirrorless camera"` | More results than specific model |
| GoPro HERO12 | `"action camera"` | Covers all action cam brands |
| MacBook Air M2 | `"macbook laptop"` | Apple official ads |
| AirPods Pro | `"wireless earbuds"` | Broader category |
| Dyson V15 | `"cordless vacuum"` | Dyson + competitors |
| Meta Quest 3 | `"vr headset"` | VR category ads |
| Nintendo Switch OLED | `"nintendo switch"` | Official Nintendo ads |
| iRobot Roomba j7+ | `"robot vacuum"` | iRobot + competitors |

**Pro Tip:** Use category names, not specific models. You'll find more ads including competitors you can learn from.

---

## What Makes Ads "Winning"

The system automatically prioritizes:

✅ **Big Brands**
- Apple, Sony, GoPro, Samsung, Canon, Nikon
- Dyson, Meta, Microsoft, Google
- These brands spend millions on tested ads

✅ **Long-Running Ads**
- 30+ days active = proven winner
- If it's still running, it's converting

✅ **Video Content**
- Video ads perform 80% better than images
- System filters for video-only

✅ **Active Campaigns**
- Currently spending money
- Not paused or expired

---

## Example Workflow

### Step 1: Discover Ads for Your Top 3 Products

```bash
# GoPro HERO12 ($105 profit)
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/discover-and-extract \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"action camera","maxExtract":3}'

# Sony A7 IV ($749 profit)
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/discover-and-extract \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"mirrorless camera","maxExtract":3}'

# MacBook Air M2 ($120 profit)
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/discover-and-extract \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"macbook laptop","maxExtract":3}'
```

### Step 2: Download the Videos

```bash
# From the response, download each videoUrl:
curl -O "https://res.cloudinary.com/.../discovered-gopro-123.mp4"
curl -O "https://res.cloudinary.com/.../discovered-sony-456.mp4"
curl -O "https://res.cloudinary.com/.../discovered-apple-789.mp4"
```

### Step 3: Analyze Patterns

Watch each video and note:
- **Hook** (first 3 seconds) - What grabs attention?
- **Problem/Solution** - What pain point is addressed?
- **Pacing** - Fast cuts or slow reveal?
- **Text overlays** - What's written and when?
- **Music/Sound** - Upbeat or calm?
- **CTA** - How do they drive the click?

### Step 4: Apply to Your Products

Use the patterns you discovered:
- Same hook style for your GoPro listing
- Similar pacing for your Sony camera
- Copy the CTA approach

---

## API Parameters

### `/discover-and-extract`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `searchTerm` | string | required | What to search for |
| `maxExtract` | number | 5 | How many videos to extract |

### `/discover`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `searchTerm` | string | required | What to search for |
| `platform` | string | "all" | "facebook", "instagram", "all" |
| `mediaType` | string | "video" | "video", "image", "all" |
| `minRunningDays` | number | 30 | Minimum days ad has been running |
| `limit` | number | 10 | Max ads to return |

### `/discover-bulk`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `products` | string[] | required | Array of search terms |
| `platform` | string | "all" | Platform filter |
| `mediaType` | string | "video" | Media type filter |
| `minRunningDays` | number | 30 | Min days running |
| `limit` | number | 5 | Max ads per product |

---

## Performance & Timing

**Discovery Speed:**
- Search + Find ads: 10-15 seconds
- Per ad extraction: 20-25 seconds
- Total for 5 ads: ~2-3 minutes

**Rate Limiting:**
- 2-second delay between extractions
- Prevents Facebook blocking
- Be patient - quality over speed

**Best Times to Run:**
- Anytime! System is autonomous
- Run overnight for bulk extractions
- Facebook Ad Library is 24/7 accessible

---

## Troubleshooting

### "No ads found for this search"

**Solutions:**
1. Try broader search terms (e.g., "camera" instead of "Sony A7 IV")
2. Use category names (e.g., "wireless earbuds" not "AirPods Pro 2")
3. Check if ads exist manually first: https://www.facebook.com/ads/library/

### "Ad extraction failed"

**Reasons:**
1. Ad was removed between discovery and extraction
2. Video URL not accessible (rare)
3. Cloudinary upload issue (check credentials)

**Solution:** System continues with next ad automatically.

### "Discovery taking too long"

**Normal:**
- First search: 15-20 seconds (loading page)
- Subsequent searches: 10-15 seconds

**If longer:**
- Facebook might be slow
- Try again in a few minutes
- System has 5-minute timeout

---

## Tips & Best Practices

### Search Tips

✅ **DO:**
- Use broad category terms
- Search for competitor products
- Look for established brands

❌ **DON'T:**
- Search exact model numbers
- Use obscure product names
- Search new/unknown brands

### Extraction Tips

✅ **DO:**
- Extract 3-5 ads per product
- Review ads before bulk extraction
- Study big brand ads first

❌ **DON'T:**
- Extract 50+ ads at once (rate limits)
- Skip the manual analysis step
- Copy ads exactly (inspiration only!)

### Analysis Tips

✅ **DO:**
- Watch each ad 3-5 times
- Take notes on patterns
- Look for common elements
- Test different hooks

❌ **DON'T:**
- Copy ads verbatim (copyright)
- Use competitor branding
- Ignore the testing phase

---

## Example Search Terms Library

### Electronics
- "wireless earbuds"
- "noise cancelling headphones"
- "bluetooth speaker"
- "smart watch"
- "fitness tracker"

### Cameras
- "mirrorless camera"
- "action camera"
- "digital camera"
- "camera lens"
- "photography gear"

### Computing
- "macbook laptop"
- "gaming laptop"
- "wireless mouse"
- "mechanical keyboard"
- "laptop stand"

### Smart Home
- "smart speaker"
- "security camera"
- "smart doorbell"
- "wifi router"
- "smart lights"

### Appliances
- "cordless vacuum"
- "robot vacuum"
- "air fryer"
- "espresso machine"
- "blender"

---

## Cost & Limits

**Infrastructure:**
- ✅ FREE - No per-request charges
- ✅ Unlimited discoveries
- ✅ Unlimited extractions

**External Services:**
- Cloudinary: Free tier covers 1,000+ ads
- Railway: Included in hosting plan

**Time Investment:**
- 2-3 minutes per product discovery
- 10-15 minutes to analyze results
- 30 minutes total for 5 products

**ROI:**
- Find proven winning formulas
- Skip months of trial & error
- Copy successful patterns
- Scale ad creation 10x faster

---

## What's Next

### Immediate (Today):
1. Run discover-and-extract for your top 3 products
2. Download and analyze the videos
3. Document patterns you see

### This Week:
1. Extract ads for all 35 active products
2. Build a pattern library
3. Create test ads using the patterns

### This Month:
1. Add $5 Anthropic credits
2. Get AI analysis of videos
3. Auto-generate ads for all products

---

## Support & Documentation

**Test the system:**
```bash
# Health check
curl https://api.arbi.creai.dev/health

# Test discovery
curl -X POST https://api.arbi.creai.dev/api/analyze-ads/discover \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"action camera","limit":3}'
```

**Files:**
- `/apps/api/src/services/scraping/adDiscovery.ts` - Discovery logic
- `/apps/api/src/routes/analyze-ads.ts` - API endpoints
- `/AD-EXTRACTION-SYSTEM.md` - Full documentation

**System Status:**
- Railway: https://railway.app/ (check logs)
- Cloudinary: https://cloudinary.com/console (check usage)

---

**Built:** January 11, 2026
**Status:** ✅ Production Ready
**Version:** 1.0
