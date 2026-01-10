/**
 * Facebook Ad Library Scraper
 * Automatically finds and downloads winning video ads
 * No manual work required
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
 * Scrape Facebook Ad Library for video ads
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

  console.log(`🔍 Scraping Facebook Ad Library for: "${query}"`);
  console.log(`   Limit: ${limit} ads`);
  console.log(`   Type: ${adType}`);

  const stagehand = new Stagehand({
    env: 'LOCAL',
    enableCaching: false,
    headless: true,
  });

  try {
    await stagehand.init();

    // Navigate to Facebook Ad Library
    const searchUrl = buildFacebookAdLibraryUrl(query, country, activeStatus);
    console.log(`   📍 Navigating to: ${searchUrl}`);

    await stagehand.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    // Wait a bit for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('   🔍 Searching for ad containers...');

    // Try multiple possible selectors (Facebook changes their structure)
    let adCards = [];
    const selectors = [
      '[data-testid="search_result_item"]',
      '[role="article"]',
      '.x1yc6y37',
      'div[class*="search"]',
    ];

    for (const selector of selectors) {
      try {
        await stagehand.page.waitForSelector(selector, { timeout: 10000 });
        adCards = await stagehand.page.$$(selector);
        if (adCards.length > 0) {
          console.log(`   ✅ Found ${adCards.length} ads using selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`   ⏭️  Selector ${selector} not found, trying next...`);
      }
    }

    if (adCards.length === 0) {
      console.log('   ⚠️  No ads found with any selector. Taking screenshot...');
      await stagehand.page.screenshot({ path: '/tmp/fb-ad-library-debug.png' });
      throw new Error('No ads found on page. Screenshot saved to /tmp/fb-ad-library-debug.png');
    }

    const scrapedAds: ScrapedAd[] = [];

    for (let i = 0; i < Math.min(adCards.length, limit); i++) {
      try {
        const card = adCards[i];

        // Check if this ad has a video
        const hasVideo = await card.$('video');

        if (adType === 'video' && !hasVideo) {
          console.log(`   ⏭️  Skipping ad ${i + 1}: No video`);
          continue;
        }

        // Extract advertiser name
        const advertiserElement = await card.$('[role="heading"]');
        const advertiser = advertiserElement
          ? await advertiserElement.textContent()
          : 'Unknown';

        // Extract ad text
        const textElement = await card.$('[data-testid="ad_creative_body"]');
        const adText = textElement ? await textElement.textContent() : '';

        // Extract platform info
        const platformElements = await card.$$('[alt*="Facebook"], [alt*="Instagram"]');
        const platforms = [];
        for (const el of platformElements) {
          const alt = await el.getAttribute('alt');
          if (alt?.includes('Facebook')) platforms.push('Facebook');
          if (alt?.includes('Instagram')) platforms.push('Instagram');
        }

        console.log(`   📹 Processing ad ${i + 1}: ${advertiser}`);

        // Get video URL
        let videoUrl = '';
        if (hasVideo) {
          const videoElement = await card.$('video');
          const videoSrc = await videoElement?.getAttribute('src');

          if (videoSrc) {
            videoUrl = videoSrc;
            console.log(`      ✅ Video URL found`);
          } else {
            // Try to find video in source element
            const sourceElement = await videoElement?.$('source');
            const sourceSrc = await sourceElement?.getAttribute('src');
            if (sourceSrc) {
              videoUrl = sourceSrc;
              console.log(`      ✅ Video URL found (from source)`);
            }
          }
        }

        if (videoUrl) {
          scrapedAds.push({
            videoUrl,
            advertiser: advertiser?.trim() || 'Unknown',
            adText: adText?.trim() || '',
            platform: platforms,
            isActive: true,
          });

          console.log(`      ✅ Ad scraped successfully`);
        } else {
          console.log(`      ⚠️  No video URL found`);
        }

        // Add delay to avoid detection
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`   ❌ Failed to scrape ad ${i + 1}:`, error.message);
      }
    }

    await stagehand.close();

    console.log(`✅ Scraped ${scrapedAds.length} video ads`);
    return scrapedAds;
  } catch (error: any) {
    console.error('❌ Facebook Ad Library scraping failed:', error.message);
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
  console.log(`📥 Downloading ${ads.length} video ads...`);

  const results: ScrapedAd[] = [];

  for (let i = 0; i < ads.length; i++) {
    const ad = ads[i];

    try {
      console.log(`   📥 Downloading ad ${i + 1}/${ads.length}...`);

      // Download video
      const videoPath = await downloadVideo(ad.videoUrl, i);
      ad.downloadedPath = videoPath;

      console.log(`      ✅ Downloaded to ${videoPath}`);

      // Upload to Cloudinary
      console.log(`      ☁️  Uploading to Cloudinary...`);

      const uploadResult = await cloudinary.uploader.upload(videoPath, {
        resource_type: 'video',
        folder: 'arbi-scraped-ads',
        public_id: `fb-ad-${Date.now()}-${i}`,
      });

      ad.cloudinaryUrl = uploadResult.secure_url;

      console.log(`      ✅ Uploaded: ${uploadResult.secure_url}`);

      // Clean up local file
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }

      results.push(ad);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`   ❌ Failed to download ad ${i + 1}:`, error.message);
    }
  }

  console.log(`✅ Downloaded and uploaded ${results.length} ads`);
  return results;
}

/**
 * Complete pipeline: Scrape → Download → Upload → Return URLs
 */
export async function scrapeAndPrepareAds(
  options: FacebookAdLibraryOptions
): Promise<{ ads: ScrapedAd[]; videoUrls: string[] }> {
  console.log('🚀 Starting automated ad scraping pipeline...');

  // Step 1: Scrape Facebook Ad Library
  const scrapedAds = await scrapeFacebookAdLibrary(options);

  if (scrapedAds.length === 0) {
    throw new Error('No video ads found');
  }

  // Step 2: Download and upload to Cloudinary
  const uploadedAds = await downloadAndUploadAds(scrapedAds);

  // Step 3: Extract video URLs
  const videoUrls = uploadedAds
    .map(ad => ad.cloudinaryUrl)
    .filter((url): url is string => !!url);

  console.log(`✅ Pipeline complete: ${videoUrls.length} videos ready for analysis`);

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

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const videoPath = path.join(tempDir, `fb-ad-${Date.now()}-${index}.mp4`);

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    timeout: 60000,
  });

  const writer = fs.createWriteStream(videoPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(videoPath));
    writer.on('error', reject);
  });
}

/**
 * Quick search: Get top 3 video ads for analysis
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
