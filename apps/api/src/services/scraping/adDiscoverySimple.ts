/**
 * Simplified Ad Discovery - No Schema Extraction
 * Uses direct page scraping instead of Stagehand's extract method
 */

import { Stagehand } from '@browserbasehq/stagehand';

export interface DiscoveredAd {
  id: string;
  url: string;
  advertiser: string;
  adText: string;
  hasVideo: boolean;
  platform: string[];
}

/**
 * Discover winning ads using direct DOM scraping (no schema)
 */
export async function discoverWinningAdsSimple(
  searchTerm: string,
  limit: number = 10
): Promise<DiscoveredAd[]> {
  console.log(`🔍 Discovering ads for: "${searchTerm}" (simple method)`);

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
      media_type: 'video',
      q: searchTerm,
    });

    const searchUrl = `${baseUrl}?${params.toString()}`;
    console.log(`   📍 Opening: ${searchUrl}`);

    await stagehand.page.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('   📊 Scraping page with evaluate...');

    // Use direct page.evaluate to scrape ads
    const ads = await stagehand.page.evaluate((maxAds) => {
      const results: any[] = [];

      try {
        // Find all ad containers (Facebook Ad Library structure)
        const adCards = document.querySelectorAll('[data-pagelet]');
        console.log(`Found ${adCards.length} potential ad containers`);

        for (const card of Array.from(adCards)) {
          if (results.length >= maxAds) break;

          // Try to extract data from this card
          try {
            // Look for video elements
            const hasVideo = card.querySelector('video') !== null;
            if (!hasVideo) continue; // Skip non-video ads

            // Extract advertiser name (look for headings or specific text)
            let advertiser = 'Unknown';
            const headingEl = card.querySelector('[role="heading"]');
            if (headingEl) {
              advertiser = headingEl.textContent?.trim() || 'Unknown';
            }

            // Extract ad text
            let adText = '';
            const textEls = card.querySelectorAll('div[dir="auto"]');
            for (const el of Array.from(textEls)) {
              const text = el.textContent?.trim();
              if (text && text.length > 20 && text.length < 500) {
                adText = text;
                break;
              }
            }

            // Extract ad ID from links or data attributes
            let adId = '';
            const links = card.querySelectorAll('a[href*="ads/library"]');
            for (const link of Array.from(links)) {
              const href = (link as HTMLAnchorElement).href;
              const match = href.match(/[?&]id=(\d+)/);
              if (match) {
                adId = match[1];
                break;
              }
            }

            if (!adId) {
              // Try data attributes
              const idAttr = card.getAttribute('data-ad-id') ||
                           card.getAttribute('id') ||
                           `temp-${Date.now()}-${Math.random()}`;
              adId = idAttr;
            }

            // Determine platforms
            const platforms: string[] = ['facebook'];
            const platformText = card.textContent || '';
            if (platformText.includes('Instagram')) platforms.push('instagram');

            results.push({
              id: adId,
              advertiser,
              adText,
              hasVideo: true,
              platforms,
            });
          } catch (cardError) {
            console.error('Error processing card:', cardError);
          }
        }
      } catch (error) {
        console.error('Error in evaluate:', error);
      }

      return results;
    }, limit);

    await stagehand.close();

    console.log(`   ✅ Found ${ads.length} ads`);

    // Convert to proper format
    const discoveredAds: DiscoveredAd[] = ads.map(ad => ({
      id: ad.id,
      url: `https://www.facebook.com/ads/library/?id=${ad.id}`,
      advertiser: ad.advertiser,
      adText: ad.adText,
      hasVideo: true,
      platform: ad.platforms,
    }));

    // Filter and prioritize big brands
    const bigBrands = ['apple', 'sony', 'gopro', 'samsung', 'canon', 'nikon', 'dyson', 'meta', 'microsoft', 'google'];
    const prioritized = discoveredAds.sort((a, b) => {
      const aIsBig = bigBrands.some(brand => a.advertiser.toLowerCase().includes(brand));
      const bIsBig = bigBrands.some(brand => b.advertiser.toLowerCase().includes(brand));
      if (aIsBig && !bIsBig) return -1;
      if (!aIsBig && bIsBig) return 1;
      return 0;
    });

    return prioritized;
  } catch (error: any) {
    console.error('❌ Ad discovery failed:', error.message);
    await stagehand.close();
    throw new Error(`Ad discovery failed: ${error.message}`);
  }
}
