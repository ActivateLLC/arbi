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
  startDate?: string;
  isActive: boolean;
  daysRunning?: number;
  hasHighEngagement?: boolean;
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

    // Wait for initial page load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if there's a country selector and handle it
    const hasCountrySelector = await stagehand.page.evaluate(() => {
      return document.body.innerText.includes('Select country') ||
             document.body.innerText.includes('Choose a country');
    });

    if (hasCountrySelector) {
      console.log('   🌍 Country selector detected - handling...');
      // The URL already has country=US in params, so just wait for redirect/load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Try clicking on United States if visible
      try {
        await stagehand.page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const usLink = links.find(link =>
            link.textContent?.includes('United States') ||
            link.textContent?.includes('USA')
          );
          if (usLink) {
            (usLink as HTMLAnchorElement).click();
          }
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (err) {
        console.log('   ⚠️  Could not auto-select country');
      }
    }

    // Wait for content to fully load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Log page title and URL for debugging
    const pageTitle = await stagehand.page.title();
    const pageUrl = stagehand.page.url();
    console.log(`   📄 Page title: "${pageTitle}"`);
    console.log(`   🌐 Page URL: ${pageUrl}`);

    // Check for login/blocking
    const pageText = await stagehand.page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`   📝 Page text (first 500 chars): ${pageText}`);
    if (pageText.includes('Log In') || pageText.includes('Sign Up') || pageText.includes('Log in to Facebook')) {
      console.warn('   ⚠️  LOGIN WALL DETECTED - Facebook requires authentication');
    }

    // Save screenshot
    await stagehand.page.screenshot({
      path: '/tmp/ad-discovery-page.png',
      fullPage: false,
    });
    console.log('   📸 Screenshot saved: /tmp/ad-discovery-page.png');

    console.log('   📊 Scraping page with evaluate...');

    // Use direct page.evaluate to scrape ads
    const ads = await stagehand.page.evaluate((maxAds) => {
      const results: any[] = [];

      try {
        // Try multiple selector strategies for Facebook Ad Library
        const selectors = [
          '[data-pagelet*="AdCard"]',
          '[data-pagelet]',
          'div[role="article"]',
          '[data-testid*="ad"]',
          'div[class*="ad-card"]',
          'div[class*="AdCard"]'
        ];

        let adCards: Element[] = [];
        for (const selector of selectors) {
          adCards = Array.from(document.querySelectorAll(selector));
          if (adCards.length > 0) {
            console.log(`✅ Found ${adCards.length} containers using selector: ${selector}`);
            break;
          }
        }

        if (adCards.length === 0) {
          console.log('❌ No ad containers found with any selector');
          console.log('Page structure:', document.body.innerHTML.substring(0, 1000));
          return [];
        }

        for (const card of adCards) {
          if (results.length >= maxAds) break;

          // Try to extract data from this card
          try {
            // Look for video elements - try multiple selectors
            const video = card.querySelector('video') ||
                         document.querySelector('video') ||
                         card.querySelector('[data-video-id]');

            const hasVideo = video !== null;
            if (!hasVideo) continue; // Skip non-video ads

            // Extract advertiser name - try multiple strategies
            let advertiser = 'Unknown';
            // Strategy 1: Look for role=heading
            let headingEl = card.querySelector('[role="heading"]');
            if (headingEl && headingEl.textContent?.trim()) {
              advertiser = headingEl.textContent.trim();
            }
            // Strategy 2: Look for strong/bold text (often advertiser name)
            if (advertiser === 'Unknown') {
              const strongEl = card.querySelector('strong');
              if (strongEl && strongEl.textContent?.trim()) {
                advertiser = strongEl.textContent.trim();
              }
            }
            // Strategy 3: Look for links (advertiser names often linked)
            if (advertiser === 'Unknown') {
              const linkEl = card.querySelector('a[href*="facebook.com"]');
              if (linkEl && linkEl.textContent?.trim() && linkEl.textContent.length < 50) {
                advertiser = linkEl.textContent.trim();
              }
            }

            // Extract ad text - try multiple strategies
            let adText = '';
            // Strategy 1: div[dir="auto"] (Facebook's text containers)
            const textEls = card.querySelectorAll('div[dir="auto"]');
            for (const el of Array.from(textEls)) {
              const text = el.textContent?.trim();
              if (text && text.length > 20 && text.length < 500 && !text.includes('http')) {
                adText = text;
                break;
              }
            }
            // Strategy 2: Just get all text if nothing found
            if (!adText) {
              const allText = card.textContent?.trim() || '';
              const sentences = allText.split('.').filter(s => s.length > 20 && s.length < 200);
              if (sentences.length > 0) {
                adText = sentences[0].trim();
              }
            }

            // Extract ad ID from links or data attributes - try multiple strategies
            let adId = '';

            // Strategy 1: Links with ads/library in href
            const links = card.querySelectorAll('a');
            for (const link of Array.from(links)) {
              const href = (link as HTMLAnchorElement).href;
              // Try multiple URL patterns
              const idMatch = href.match(/[?&]id=(\d+)/) ||
                             href.match(/ads\/library\/(\d+)/) ||
                             href.match(/ad_id=(\d+)/);
              if (idMatch) {
                adId = idMatch[1];
                break;
              }
            }

            // Strategy 2: Look in onclick handlers and data attributes
            if (!adId) {
              const allElements = card.querySelectorAll('*');
              for (const el of Array.from(allElements)) {
                // Check data attributes
                const id = el.getAttribute('data-ad-id') ||
                          el.getAttribute('data-adid') ||
                          el.getAttribute('data-id') ||
                          el.getAttribute('data-ad-archive-id');
                if (id && id.match(/^\d+$/)) {
                  adId = id;
                  break;
                }

                // Check onclick attribute for ad IDs
                const onclick = el.getAttribute('onclick') || '';
                const onclickMatch = onclick.match(/(\d{10,})/); // Ad IDs are typically 10+ digits
                if (onclickMatch) {
                  adId = onclickMatch[1];
                  break;
                }
              }
            }

            // Strategy 3: Look in card's entire HTML for ad ID patterns
            if (!adId) {
              const cardHTML = card.innerHTML;
              // Look for common ad ID patterns in HTML
              const htmlMatches = [
                cardHTML.match(/ad_archive_id["\s:=]+(\d{10,})/i),
                cardHTML.match(/adId["\s:=]+(\d{10,})/i),
                cardHTML.match(/ad_id["\s:=]+(\d{10,})/i),
                cardHTML.match(/["']id["']\s*:\s*["'](\d{10,})["']/),
              ];

              for (const match of htmlMatches) {
                if (match && match[1]) {
                  adId = match[1];
                  break;
                }
              }
            }

            // Strategy 4: Look near the video element specifically
            if (!adId && video) {
              let currentEl: Element | null = video;
              // Walk up 5 levels looking for ID
              for (let i = 0; i < 5; i++) {
                if (!currentEl) break;

                const parentHTML = currentEl.outerHTML;
                const match = parentHTML.match(/[?&]id=(\d{10,})/) ||
                             parentHTML.match(/data-ad[^=]*=["'](\d{10,})["']/i);
                if (match) {
                  adId = match[1];
                  break;
                }

                currentEl = currentEl.parentElement;
              }
            }

            // Skip this ad if we couldn't find a real ID
            if (!adId || !adId.match(/^\d{10,}$/)) {
              console.log('⚠️  Skipping ad - no real Facebook ad ID found');
              continue;
            }

            console.log(`✅ Found ad ID: ${adId}`);

            // Determine platforms
            const platforms: string[] = ['facebook'];
            const platformText = card.textContent || '';
            if (platformText.includes('Instagram')) platforms.push('instagram');

            // Extract start date (for calculating days running)
            let startDate = '';
            const dateRegex = /Started running on (.+?)(?:\.|$)/i;
            const dateMatch = card.textContent?.match(dateRegex);
            if (dateMatch) {
              startDate = dateMatch[1].trim();
            }

            // Calculate days running (for prioritization)
            let daysRunning = 0;
            if (startDate) {
              try {
                const start = new Date(startDate);
                const now = new Date();
                daysRunning = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              } catch (err) {
                console.error('Error parsing date:', err);
              }
            }

            // Extract engagement indicators (not always visible, but try)
            const hasHighEngagement =
              card.textContent?.includes('reach') ||
              card.textContent?.includes('impressions') ||
              card.textContent?.toLowerCase().includes('views');

            results.push({
              id: adId,
              advertiser,
              adText,
              hasVideo: true,
              platforms,
              startDate,
              daysRunning,
              hasHighEngagement,
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
      startDate: ad.startDate,
      isActive: true,
      daysRunning: ad.daysRunning,
      hasHighEngagement: ad.hasHighEngagement,
    }));

    // Prioritize highest turnover ads (long-running + big brands + high engagement)
    const bigBrands = ['apple', 'sony', 'gopro', 'samsung', 'canon', 'nikon', 'dyson', 'meta', 'microsoft', 'google'];
    const prioritized = discoveredAds.sort((a, b) => {
      // Priority 1: Long-running ads (30+ days = proven winners)
      const aLongRunning = (a.daysRunning || 0) >= 30;
      const bLongRunning = (b.daysRunning || 0) >= 30;
      if (aLongRunning && !bLongRunning) return -1;
      if (!aLongRunning && bLongRunning) return 1;

      // Priority 2: High engagement indicators
      if (a.hasHighEngagement && !b.hasHighEngagement) return -1;
      if (!a.hasHighEngagement && b.hasHighEngagement) return 1;

      // Priority 3: Big brands (established advertisers)
      const aIsBig = bigBrands.some(brand => a.advertiser.toLowerCase().includes(brand));
      const bIsBig = bigBrands.some(brand => b.advertiser.toLowerCase().includes(brand));
      if (aIsBig && !bIsBig) return -1;
      if (!aIsBig && bIsBig) return 1;

      // Priority 4: Sort by days running (more = better)
      return (b.daysRunning || 0) - (a.daysRunning || 0);
    });

    console.log(`   🎯 Prioritized by: long-running (30+ days), high engagement, big brands`);
    console.log(`   📊 Top ad: ${prioritized[0]?.advertiser} (${prioritized[0]?.daysRunning || 0} days running)`);

    return prioritized;
  } catch (error: any) {
    console.error('❌ Ad discovery failed:', error.message);
    await stagehand.close();
    throw new Error(`Ad discovery failed: ${error.message}`);
  }
}
