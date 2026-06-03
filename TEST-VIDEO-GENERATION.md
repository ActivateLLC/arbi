# 🧪 Test Video Generation Setup

Quick tests to verify Remotion video generation is working!

---

## ✅ Pre-Flight Checks

### **1. Check Files Exist**

```bash
ls -la apps/api/src/services/remotion/
```

**Expected output:**
```
ProductShowcase.tsx  ← Video template component
index.tsx            ← Remotion compositions
renderVideo.ts       ← Rendering service
```

✅ **PASS** - All files exist!

### **2. Check Dependencies in package.json**

```bash
cat apps/api/package.json | grep remotion
```

**Expected output:**
```
"@remotion/bundler": "^4.0.0",
"@remotion/cli": "^4.0.0",
"@remotion/renderer": "^4.0.0",
"remotion": "^4.0.0",
```

✅ **PASS** - Dependencies added!

---

## 🚀 Installation Test

### **Step 1: Install Dependencies**

```bash
cd apps/api
pnpm install
```

**Expected:** Installs Remotion + all dependencies

**Note:** May take 2-3 minutes first time

### **Step 2: Verify Remotion Installed**

```bash
npx remotion --version
```

**Expected output:**
```
4.0.x
```

✅ **PASS** - Remotion CLI works!

---

## 🎬 Video Generation Tests

### **Test 1: Preview Template (No Server Needed)**

```bash
cd apps/api
npx remotion preview src/services/remotion/index.tsx
```

**Expected:**
- Opens browser at `http://localhost:3000`
- Shows 3 video templates:
  - ProductShowcase (15s horizontal)
  - ProductShowcase30s (30s horizontal)
  - ProductShowcaseVertical (15s vertical)
- Can click play to preview animations
- Can edit props in real-time

✅ **PASS** - Template preview works!

### **Test 2: Render Sample Video (No Server Needed)**

```bash
cd apps/api
npx remotion render src/services/remotion/index.tsx ProductShowcase out/test-video.mp4 \
  --props='{"productTitle":"Test Product","productImages":["https://res.cloudinary.com/demo/image/upload/sample.jpg"],"marketplacePrice":99.99,"ctaText":"Shop Now","includePrice":true}'
```

**Expected:**
- Renders 15-second video
- Saves to `out/test-video.mp4`
- Takes ~30-60 seconds
- Video playable with VLC or any player

✅ **PASS** - Video rendering works!

### **Test 3: Check API Status**

```bash
# Start your API server first
npm run dev

# Then in another terminal:
curl http://localhost:3000/api/generate-video/status | jq
```

**Expected output:**
```json
{
  "status": "ok",
  "videoGeneration": {
    "available": true,
    "activeMethod": "remotion",
    "features": {
      "remotion": {
        "enabled": true,
        "description": "FREE open-source video generation with React",
        "cost": "$0 (unlimited videos)",
        "priority": 1,
        "installation": "Installed ✅"
      }
    }
  },
  "recommendation": "✅ Using Remotion (FREE) - unlimited professional videos!",
  "nextSteps": [
    "Preview template: npx remotion preview src/services/remotion/index.tsx",
    "Generate video: POST /api/generate-video/:listingId"
  ]
}
```

✅ **PASS** - API detects Remotion!

### **Test 4: Generate Real Product Video**

**Prerequisites:**
- API server running (`npm run dev`)
- At least one marketplace listing with Cloudinary-hosted images

```bash
# Get a listing ID
curl http://localhost:3000/api/marketplace/listings | jq '.listings[0].listingId'

# Generate video (replace LISTING_ID with actual ID)
curl -X POST http://localhost:3000/api/generate-video/LISTING_ID \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 15,
    "orientation": "horizontal",
    "includePrice": true,
    "includeCTA": true,
    "ctaText": "Shop Now"
  }' | jq
```

**Expected output:**
```json
{
  "success": true,
  "listingId": "listing_...",
  "productTitle": "Sony Alpha A7 IV Camera",
  "video": {
    "url": "https://res.cloudinary.com/.../video.mp4",
    "thumbnail": "https://res.cloudinary.com/.../video.jpg",
    "duration": 15,
    "width": 1920,
    "height": 1080,
    "method": "remotion"  ← Confirms Remotion was used!
  },
  "message": "Product video generated successfully"
}
```

✅ **PASS** - Video generated and uploaded!

---

## 🐛 Troubleshooting

### **Problem: "Cannot find module 'remotion'"**

**Solution:**
```bash
cd apps/api
pnpm install
```

### **Problem: "Composition not found"**

**Available compositions:**
- `ProductShowcase` (15s, horizontal, 1920x1080)
- `ProductShowcase30s` (30s, horizontal, 1920x1080)
- `ProductShowcaseVertical` (15s, vertical, 1080x1920)

**Check spelling matches exactly!**

### **Problem: "Remotion entry point not found"**

**Solution:**
```bash
# Verify files exist
ls -la apps/api/src/services/remotion/

# Should show:
# ProductShowcase.tsx
# index.tsx
# renderVideo.ts
```

### **Problem: "FFmpeg not found"**

**Solution:** Remotion v4+ includes FFmpeg - no separate install needed!

If still having issues:
```bash
npx remotion ffmpeg
```

### **Problem: Video rendering is slow**

**Normal!** First render takes 1-2 minutes. This is expected for video rendering.

**Speed up:**
- Use shorter duration (15s instead of 30s)
- Reduce resolution in template
- Use background worker queue for batch jobs

### **Problem: "No Cloudinary-hosted images"**

**Solution:** Product must have images uploaded to Cloudinary first.

Check:
```bash
curl http://localhost:3000/api/marketplace/listings/:id | jq '.productImages'
```

Should show URLs like: `https://res.cloudinary.com/...`

---

## ✅ Success Criteria

All tests passed if you can:

1. ✅ Preview templates in browser
2. ✅ Render sample video to file
3. ✅ API status shows `"activeMethod": "remotion"`
4. ✅ Generate real video with product data
5. ✅ Video uploaded to Cloudinary

---

## 🎯 Next Steps After Testing

Once all tests pass:

### **1. Generate Videos for Top Products**

```bash
# Get top products by profit
curl http://localhost:3000/api/marketplace/listings | jq '.listings | sort_by(.estimatedProfit) | reverse | .[0:10] | .[].listingId'

# Batch generate (replace IDs)
curl -X POST http://localhost:3000/api/generate-video/batch \
  -H "Content-Type: application/json" \
  -d '{
    "listingIds": ["listing_1", "listing_2", "listing_3"],
    "duration": 15
  }'
```

### **2. Add Videos to Google Ads**

1. Get video URLs from API response
2. Go to Google Ads Performance Max campaign
3. Click "Assets" → "Videos"
4. Add video URL
5. Monitor ad strength → Should improve to "Excellent"

### **3. Create Vertical Videos for Stories**

```bash
curl -X POST http://localhost:3000/api/generate-video/:listingId \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 15,
    "orientation": "vertical"
  }'
```

Use for Instagram Stories, TikTok, Google Discover

### **4. Deploy to Railway**

```bash
git push
```

Railway will auto-install Remotion dependencies and deploy!

---

## 📊 Performance Benchmarks

**Expected rendering times:**

| Video Type | Duration | Time to Render | File Size |
|------------|----------|----------------|-----------|
| Horizontal 15s | 15s | 30-60s | 2-5 MB |
| Horizontal 30s | 30s | 60-120s | 4-10 MB |
| Vertical 15s | 15s | 30-60s | 2-5 MB |

**Batch generation (10 products):**
- Total time: ~10-15 minutes
- Can run in background worker queue

---

## 🎉 All Tests Passing?

**You're ready to generate unlimited FREE videos!** 🚀

See:
- **REMOTION-QUICK-START.md** - Quick start guide
- **VIDEO-AD-GENERATION-SETUP.md** - Full documentation
- **PERFORMANCE-MAX-ASSET-GUIDE.md** - How to use videos in ads
