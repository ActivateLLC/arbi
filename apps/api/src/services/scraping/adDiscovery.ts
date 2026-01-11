/**
 * Automated Ad Discovery System
 * Finds winning ads from Facebook Ad Library based on search criteria
 */

import { Stagehand } from '@browserbasehq/stagehand';

export interface AdDiscoveryOptions {
  searchTerm: string;
  platform?: 'facebook' | 'instagram' | 'all';
  mediaType?: 'video' | 'image' | 'all';
  minRunningDays?: number;
  limit?: number;
}

export interface DiscoveredAd {
  id: string;
  url: string;
  advertiser: string;
  adText: string;
  hasVideo: boolean;
  platform: string[];
  startDate?: string;
  isActive: boolean;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

/**
 * Search Facebook Ad Library and discover winning ads
 */
export async function discoverWinningAds(
  options: AdDiscoveryOptions
): Promise<DiscoveredAd[]> {
  const {
    searchTerm,
    platform = 'all',
    mediaType = 'video',
    minRunningDays = 30,
    limit = 10,
  } = options;

  console.log(`🔍 Discovering ads for: "${searchTerm}"`);
  console.log(`   Filters: ${mediaType} ads, ${platform} platform, min ${minRunningDays} days running`);

  const stagehand = new Stagehand({
    env: 'LOCAL',
    enableCaching: false,
    headless: true,
    domSettleTimeoutMs: 5000,
  });

  try {
    await stagehand.init();

    // Build Facebook Ad Library search URL
    const baseUrl = 'https://www.facebook.com/ads/library/';
    const params = new URLSearchParams({
      active_status: 'active',
      ad_type: 'all',
      country: 'US',
      media_type: mediaType === 'video' ? 'video' : 'all',
      q: searchTerm,
    });

    const searchUrl = `${baseUrl}?${params.toString()}`;
    console.log(`   📍 Opening: ${searchUrl}`);

    await stagehand.page.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 8000));

    console.log('   🤖 Using AI to extract ads...');

    // Use Stagehand AI to extract ad data
    const result = await stagehand.extract({
      instruction: `Find all video ad cards on this page. For each ad, extract:
        1. The advertiser/brand name
        2. The ad text/copy (the main message)
        3. The ad ID from the URL or data attributes
        4. Which platforms it's running on (Facebook, Instagram, etc.)
        5. When the ad started running (if visible)
        6. Any engagement metrics visible (likes, comments, shares)

        Look for:
        - Big brand names (Apple, Sony, GoPro, Samsung, etc.)
        - Long-running ads (30+ days if date is visible)
        - High engagement (lots of interactions)
        - Professional video content

        Return an array of the top ${limit} most promising ads.
        Only include ads that have VIDEO content.`,
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            advertiser: { type: 'string' },
            adText: { type: 'string' },
            adId: { type: 'string' },
            platforms: { type: 'array', items: { type: 'string' } },
            startDate: { type: 'string' },
            hasVideo: { type: 'boolean' },
          },
          required: ['advertiser', 'adText', 'adId'],
        },
      },
    });

    await stagehand.close();

    const extractedData = result as any;
    const ads: DiscoveredAd[] = [];

    if (Array.isArray(extractedData)) {
      for (const ad of extractedData) {
        if (!ad.adId) continue;

        ads.push({
          id: ad.adId,
          url: `https://www.facebook.com/ads/library/?id=${ad.adId}`,
          advertiser: ad.advertiser || 'Unknown',
          adText: ad.adText || '',
          hasVideo: ad.hasVideo !== false,
          platform: ad.platforms || ['facebook'],
          startDate: ad.startDate,
          isActive: true,
          engagement: {},
        });
      }
    }

    console.log(`   ✅ Found ${ads.length} winning ads`);

    // Filter by big brands if applicable
    const bigBrands = ['apple', 'sony', 'gopro', 'samsung', 'canon', 'nikon', 'dyson', 'meta', 'microsoft', 'google'];
    const prioritizedAds = ads.sort((a, b) => {
      const aIsBigBrand = bigBrands.some(brand => a.advertiser.toLowerCase().includes(brand));
      const bIsBigBrand = bigBrands.some(brand => b.advertiser.toLowerCase().includes(brand));

      if (aIsBigBrand && !bIsBigBrand) return -1;
      if (!aIsBigBrand && bIsBigBrand) return 1;
      return 0;
    });

    return prioritizedAds.slice(0, limit);
  } catch (error: any) {
    console.error('❌ Ad discovery failed:', error.message);
    await stagehand.close();
    throw new Error(`Ad discovery failed: ${error.message}`);
  }
}

/**
 * Discover ads for multiple products at once
 */
export async function discoverAdsForProducts(
  products: string[],
  options?: Partial<AdDiscoveryOptions>
): Promise<Map<string, DiscoveredAd[]>> {
  const results = new Map<string, DiscoveredAd[]>();

  for (const product of products) {
    try {
      const ads = await discoverWinningAds({
        searchTerm: product,
        ...options,
      });
      results.set(product, ads);

      // Rate limiting - wait between searches
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error: any) {
      console.error(`Failed to discover ads for ${product}:`, error.message);
      results.set(product, []);
    }
  }

  return results;
}
