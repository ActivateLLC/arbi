/**
 * Facebook Ad Library Scraper v2
 * Uses Stagehand's AI capabilities to intelligently find ads
 * No brittle CSS selectors - uses natural language instructions
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface ScrapedAd {
  videoUrl: string;
  advertiser: string;
  adText: string;
  platform: string[];
  isActive: boolean;
  downloadedPath?: string;
  cloudinaryUrl?: string;
}

export interface FacebookAdLibraryOptions {
  query: string;
  limit?: number;
  adType?: 'all' | 'video' | 'image';
  country?: string;
  activeStatus?: 'all' | 'active' | 'inactive';
}

/**
 * Scrape Facebook Ad Library using AI-powered element detection
 */
export async function scrapeFacebookAdLibrary(
  options: FacebookAdLibraryOptions
): Promise<ScrapedAd[]> {
  const {
    query,
    limit = 5,
    adType = 'video',
    country = 'US',
    activeStatus = 'all',
  } = options;

  console.log(`🤖 AI-Powered Scraper: Searching for "${query}"`);
  console.log(`   Target: ${limit} ${adType} ads`);

  const stagehand = new Stagehand({
    env: 'LOCAL',
    enableCaching: false,
    headless: true, // Headless for production
    domSettleTimeoutMs: 5000,
  });

  try {
    await stagehand.init();

    // Set realistic user agent and viewport
    await stagehand.page.setViewport({ width: 1920, height: 1080 });
    await stagehand.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to Facebook Ad Library
    const searchUrl = buildFacebookAdLibraryUrl(query, country, activeStatus);
    console.log(`   📍 Opening: ${searchUrl}`);

    await stagehand.page.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for initial load
    console.log('   ⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll to trigger lazy loading
    console.log('   📜 Scrolling to load content...');
    await stagehand.page.evaluate(() => {
      window.scrollBy(0, 1000);
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page content for debugging
    const pageContent = await stagehand.page.content();
    console.log(`   📄 Page content length: ${pageContent.length} chars`);

    // Check if we hit a login wall
    const hasLoginPrompt = pageContent.includes('Log In') || pageContent.includes('Sign Up');
    if (hasLoginPrompt) {
      console.log('   ⚠️  Login wall detected');
    }

    // Take screenshot for debugging
    await stagehand.page.screenshot({
      path: '/tmp/fb-ad-library-loaded.png',
      fullPage: true,
    });
    console.log('   📸 Screenshot saved: /tmp/fb-ad-library-loaded.png');

    // Use Stagehand's AI to extract ad data
    console.log('   🤖 Using AI to extract ad information...');

    const adsData = await stagehand.extract({
      instruction: `Find all video ad cards on this page. For each ad, extract:
        1. The advertiser/brand name
        2. The ad text/copy
        3. The video URL (look for video elements and their src attributes)
        4. Which platforms it's running on (Facebook, Instagram, etc.)

        Return an array of objects with these fields: advertiser, adText, videoUrl, platforms.
        Only include ads that have video content.
        Limit to ${limit} ads.`,
      schema: {
        type: 'object',
        properties: {
          ads: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                advertiser: { type: 'string' },
                adText: { type: 'string' },
                videoUrl: { type: 'string' },
                platforms: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    console.log('   ✅ AI extraction complete');

    // Parse the extracted data
    const extractedAds = (adsData as any).ads || [];
    console.log(`   📊 AI extracted ${extractedAds.length} ads`);

    if (extractedAds.length === 0) {
      console.log('   ⚠️  No ads found. Possible reasons:');
      console.log('       - Login wall blocking access');
      console.log('       - Anti-bot protection');
      console.log('       - Page structure changed');
      console.log('       - Content not loaded yet');

      // Save HTML for debugging
      const html = await stagehand.page.content();
      const debugPath = '/tmp/fb-ad-library-debug.html';
      require('fs').writeFileSync(debugPath, html);
      console.log(`   💾 HTML saved to: ${debugPath}`);

      await stagehand.close();
      throw new Error(
        'No ads found. Check /tmp/fb-ad-library-loaded.png and /tmp/fb-ad-library-debug.html for details.'
      );
    }

    const scrapedAds: ScrapedAd[] = extractedAds
      .filter((ad: any) => ad.videoUrl && ad.videoUrl.trim() !== '')
      .slice(0, limit)
      .map((ad: any) => ({
        videoUrl: ad.videoUrl,
        advertiser: ad.advertiser || 'Unknown',
        adText: ad.adText || '',
        platform: ad.platforms || [],
        isActive: true,
      }));

    await stagehand.close();

    if (scrapedAds.length === 0) {
      throw new Error(
        `AI found ${extractedAds.length} ads but none had valid video URLs`
      );
    }

    console.log(`✅ Successfully scraped ${scrapedAds.length} video ads`);
    return scrapedAds;
  } catch (error: any) {
    console.error('❌ AI scraping failed:', error.message);
    await stagehand.close();
    throw new Error(`Failed to scrape Facebook Ad Library: ${error.message}`);
  }
}

/**
 * Download scraped ads and upload to Cloudinary
 */
export async function downloadAndUploadAds(
  ads: ScrapedAd[]
): Promise<ScrapedAd[]> {
  console.log(`📥 Processing ${ads.length} video ads...`);

  const results: ScrapedAd[] = [];

  for (let i = 0; i < ads.length; i++) {
    const ad = ads[i];

    try {
      console.log(`   📥 [${i + 1}/${ads.length}] ${ad.advertiser}...`);

      // Download video
      const videoPath = await downloadVideo(ad.videoUrl, i);
      ad.downloadedPath = videoPath;

      console.log(`      ✅ Downloaded`);

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(videoPath, {
        resource_type: 'video',
        folder: 'arbi-scraped-ads',
        public_id: `fb-ad-${Date.now()}-${i}`,
        tags: ['facebook', 'scraped', ad.advertiser.toLowerCase().replace(/\s+/g, '-')],
      });

      ad.cloudinaryUrl = uploadResult.secure_url;

      console.log(`      ☁️  Uploaded: ${uploadResult.secure_url}`);

      // Clean up local file
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }

      results.push(ad);

      // Delay to avoid rate limiting
      if (i < ads.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to process ad ${i + 1}:`, error.message);
    }
  }

  console.log(`✅ Processed ${results.length}/${ads.length} ads`);
  return results;
}

/**
 * Complete pipeline: Scrape → Download → Upload
 */
export async function scrapeAndPrepareAds(
  options: FacebookAdLibraryOptions
): Promise<{ ads: ScrapedAd[]; videoUrls: string[] }> {
  console.log('🚀 Starting AI-powered ad scraping pipeline...');

  // Step 1: Scrape using AI
  const scrapedAds = await scrapeFacebookAdLibrary(options);

  if (scrapedAds.length === 0) {
    throw new Error('No video ads found');
  }

  // Step 2: Download and upload
  const uploadedAds = await downloadAndUploadAds(scrapedAds);

  // Step 3: Extract URLs
  const videoUrls = uploadedAds
    .map(ad => ad.cloudinaryUrl)
    .filter((url): url is string => !!url);

  console.log(`✅ Pipeline complete: ${videoUrls.length} videos ready`);

  return {
    ads: uploadedAds,
    videoUrls,
  };
}

/**
 * Build Facebook Ad Library search URL
 */
function buildFacebookAdLibraryUrl(
  query: string,
  country: string,
  activeStatus: string
): string {
  const baseUrl = 'https://www.facebook.com/ads/library/';
  const params = new URLSearchParams({
    active_status: activeStatus,
    ad_type: 'all',
    country,
    q: query,
    media_type: 'video',
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Download video from URL
 */
async function downloadVideo(url: string, index: number): Promise<string> {
  const tempDir = '/tmp/facebook-ads';

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const videoPath = path.join(tempDir, `fb-ad-${Date.now()}-${index}.mp4`);

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    timeout: 60000,
    maxRedirects: 5,
  });

  const writer = fs.createWriteStream(videoPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(videoPath));
    writer.on('error', reject);
  });
}

/**
 * Quick search: Get top 3 video ads
 */
export async function quickAdSearch(
  productName: string
): Promise<string[]> {
  const { videoUrls } = await scrapeAndPrepareAds({
    query: productName,
    limit: 3,
    adType: 'video',
  });

  return videoUrls;
}
