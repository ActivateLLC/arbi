/**
 * Extract video from specific Facebook Ad Library ad page
 */

import { Stagehand } from '@browserbasehq/stagehand';
import fs from 'fs';
import axios from 'axios';

export async function extractVideoFromAdPage(adUrl: string): Promise<{
  videoUrl: string;
  advertiser: string;
  adText: string;
}> {
  console.log(`🎯 Extracting video from ad: ${adUrl}`);

  const stagehand = new Stagehand({
    env: 'LOCAL',
    enableCaching: false,
    headless: true,
    domSettleTimeoutMs: 5000,
  });

  try {
    await stagehand.init();

    console.log('   📍 Opening ad page...');
    await stagehand.page.goto(adUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Take screenshot
    await stagehand.page.screenshot({
      path: '/tmp/fb-ad-specific.png',
      fullPage: true,
    });
    console.log('   📸 Screenshot saved');

    // Extract video URL using multiple methods
    console.log('   🔍 Looking for video element...');

    // Method 1: Find video element directly
    let videoUrl = await stagehand.page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        return video.src || video.currentSrc;
      }

      // Method 2: Check source elements
      const source = document.querySelector('video source');
      if (source) {
        return source.getAttribute('src');
      }

      return null;
    });

    // Method 3: Use AI to extract data
    if (!videoUrl) {
      console.log('   🤖 Using AI to find video...');

      const data = await stagehand.extract({
        instruction: `Find the video element on this ad page and extract:
          1. The video URL (src attribute)
          2. The advertiser name
          3. The ad text/copy

          Return these fields: videoUrl, advertiser, adText`,
        schema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string' },
            advertiser: { type: 'string' },
            adText: { type: 'string' },
          },
        },
      });

      videoUrl = (data as any).videoUrl;
    }

    // Get advertiser and text
    const pageData = await stagehand.page.evaluate(() => {
      // Find advertiser (usually in a heading)
      const advertiserEl = document.querySelector('[role="heading"]');
      const advertiser = advertiserEl?.textContent || 'Unknown';

      // Find ad text
      const textEl = document.querySelector('[data-testid="ad_creative_body"]');
      const adText = textEl?.textContent || '';

      return { advertiser, adText };
    });

    await stagehand.close();

    if (!videoUrl) {
      throw new Error('Could not find video URL on page');
    }

    console.log(`   ✅ Video found: ${videoUrl.substring(0, 100)}...`);
    console.log(`   ✅ Advertiser: ${pageData.advertiser}`);

    return {
      videoUrl,
      advertiser: pageData.advertiser,
      adText: pageData.adText,
    };
  } catch (error: any) {
    console.error('❌ Failed to extract video:', error.message);
    await stagehand.close();
    throw new Error(`Failed to extract video: ${error.message}`);
  }
}

/**
 * Download video from URL
 */
export async function downloadVideo(url: string): Promise<string> {
  const videoPath = `/tmp/fb-ad-${Date.now()}.mp4`;

  console.log('   📥 Downloading video...');

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    timeout: 60000,
  });

  const writer = fs.createWriteStream(videoPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(`   ✅ Downloaded to ${videoPath}`);
      resolve(videoPath);
    });
    writer.on('error', reject);
  });
}
