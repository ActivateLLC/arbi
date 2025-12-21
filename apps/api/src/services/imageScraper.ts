/**
 * Multi-Source Image Scraper
 *
 * Scrapes product images from multiple sources:
 * - Google Images
 * - Manufacturer websites (Sony, Canon, Apple, etc.)
 * - Retailer sites (Best Buy, B&H Photo, Newegg, etc.)
 *
 * Returns 3-5 high-quality product images for carousel display
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedImage {
  url: string;
  source: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface ImageScraperResult {
  images: ScrapedImage[];
  totalFound: number;
  sources: string[];
}

export class ImageScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Scrape images for a product from multiple sources
   */
  async scrapeProductImages(
    productTitle: string,
    asin?: string,
    maxImages: number = 5
  ): Promise<ImageScraperResult> {
    console.log(`🖼️  Scraping images for: ${productTitle}`);

    const allImages: ScrapedImage[] = [];
    const sources: string[] = [];

    try {
      // 1. Try manufacturer website first (best quality)
      const manufacturerImages = await this.scrapeManufacturerSite(productTitle);
      if (manufacturerImages.length > 0) {
        allImages.push(...manufacturerImages);
        sources.push('manufacturer');
        console.log(`   ✅ Found ${manufacturerImages.length} images from manufacturer`);
      }

      // 2. Try Best Buy (high quality product images)
      const bestBuyImages = await this.scrapeBestBuy(productTitle);
      if (bestBuyImages.length > 0) {
        allImages.push(...bestBuyImages);
        sources.push('bestbuy');
        console.log(`   ✅ Found ${bestBuyImages.length} images from Best Buy`);
      }

      // 3. Try B&H Photo (excellent for cameras/electronics)
      const bhPhotoImages = await this.scrapeBHPhoto(productTitle);
      if (bhPhotoImages.length > 0) {
        allImages.push(...bhPhotoImages);
        sources.push('bhphoto');
        console.log(`   ✅ Found ${bhPhotoImages.length} images from B&H Photo`);
      }

      // 4. Try Newegg (good for tech products)
      const neweggImages = await this.scrapeNewegg(productTitle);
      if (neweggImages.length > 0) {
        allImages.push(...neweggImages);
        sources.push('newegg');
        console.log(`   ✅ Found ${neweggImages.length} images from Newegg`);
      }

      // 5. Fallback to Google Images if needed
      if (allImages.length < maxImages) {
        const googleImages = await this.scrapeGoogleImages(productTitle);
        if (googleImages.length > 0) {
          allImages.push(...googleImages);
          sources.push('google');
          console.log(`   ✅ Found ${googleImages.length} images from Google Images`);
        }
      }
    } catch (error: any) {
      console.error(`   ⚠️  Error scraping images: ${error.message}`);
    }

    // Deduplicate and select best images
    const uniqueImages = this.deduplicateImages(allImages);
    const bestImages = uniqueImages.slice(0, maxImages);

    console.log(`   📊 Total: ${bestImages.length} unique images from ${sources.length} sources`);

    return {
      images: bestImages,
      totalFound: allImages.length,
      sources,
    };
  }

  /**
   * Scrape manufacturer website (Sony, Canon, Apple, etc.)
   */
  private async scrapeManufacturerSite(productTitle: string): Promise<ScrapedImage[]> {
    const images: ScrapedImage[] = [];

    try {
      // Extract brand from product title
      const brand = this.extractBrand(productTitle);
      if (!brand) return images;

      // Map brands to their website search patterns
      const brandSearchUrls: Record<string, string> = {
        sony: `https://www.sony.com/electronics/search?q=${encodeURIComponent(productTitle)}`,
        canon: `https://www.usa.canon.com/search?q=${encodeURIComponent(productTitle)}`,
        nikon: `https://www.nikonusa.com/search?q=${encodeURIComponent(productTitle)}`,
        apple: `https://www.apple.com/shop/search?q=${encodeURIComponent(productTitle)}`,
        samsung: `https://www.samsung.com/us/search/?searchvalue=${encodeURIComponent(productTitle)}`,
        lg: `https://www.lg.com/us/search?q=${encodeURIComponent(productTitle)}`,
      };

      const searchUrl = brandSearchUrls[brand.toLowerCase()];
      if (!searchUrl) return images;

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Extract product images (common patterns)
      $('img[src*="product"], img[alt*="product"], .product-image img, [class*="product"] img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        const alt = $(el).attr('alt') || '';

        if (src && this.isValidImageUrl(src)) {
          images.push({
            url: this.normalizeImageUrl(src, searchUrl),
            source: `${brand}-official`,
            alt,
          });
        }
      });
    } catch (error: any) {
      console.warn(`   ⚠️  Manufacturer scrape failed: ${error.message}`);
    }

    return images.slice(0, 3); // Max 3 from manufacturer
  }

  /**
   * Scrape Best Buy
   */
  private async scrapeBestBuy(productTitle: string): Promise<ScrapedImage[]> {
    const images: ScrapedImage[] = [];

    try {
      const searchUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(productTitle)}`;

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Best Buy product images
      $('.product-image img, .sku-image img, [class*="ProductImage"] img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        const alt = $(el).attr('alt') || '';

        if (src && this.isValidImageUrl(src)) {
          images.push({
            url: this.normalizeImageUrl(src, searchUrl),
            source: 'bestbuy',
            alt,
          });
        }
      });
    } catch (error: any) {
      console.warn(`   ⚠️  Best Buy scrape failed: ${error.message}`);
    }

    return images.slice(0, 2);
  }

  /**
   * Scrape B&H Photo
   */
  private async scrapeBHPhoto(productTitle: string): Promise<ScrapedImage[]> {
    const images: ScrapedImage[] = [];

    try {
      const searchUrl = `https://www.bhphotovideo.com/c/search?q=${encodeURIComponent(productTitle)}`;

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // B&H Photo product images
      $('[data-selenium="productImage"] img, .productInner img, [class*="product"] img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        const alt = $(el).attr('alt') || '';

        if (src && this.isValidImageUrl(src)) {
          images.push({
            url: this.normalizeImageUrl(src, searchUrl),
            source: 'bhphoto',
            alt,
          });
        }
      });
    } catch (error: any) {
      console.warn(`   ⚠️  B&H Photo scrape failed: ${error.message}`);
    }

    return images.slice(0, 2);
  }

  /**
   * Scrape Newegg
   */
  private async scrapeNewegg(productTitle: string): Promise<ScrapedImage[]> {
    const images: ScrapedImage[] = [];

    try {
      const searchUrl = `https://www.newegg.com/p/pl?d=${encodeURIComponent(productTitle)}`;

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Newegg product images
      $('.item-img img, [class*="ItemImage"] img, [class*="product"] img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        const alt = $(el).attr('alt') || '';

        if (src && this.isValidImageUrl(src)) {
          images.push({
            url: this.normalizeImageUrl(src, searchUrl),
            source: 'newegg',
            alt,
          });
        }
      });
    } catch (error: any) {
      console.warn(`   ⚠️  Newegg scrape failed: ${error.message}`);
    }

    return images.slice(0, 2);
  }

  /**
   * Scrape Google Images (fallback)
   */
  private async scrapeGoogleImages(productTitle: string): Promise<ScrapedImage[]> {
    const images: ScrapedImage[] = [];

    try {
      // Use Google Custom Search API if API key available
      if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
        const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(productTitle)}&searchType=image&num=5`;

        const response = await axios.get(apiUrl, { timeout: 10000 });

        if (response.data.items) {
          for (const item of response.data.items) {
            images.push({
              url: item.link,
              source: 'google-api',
              alt: item.title,
              width: item.image?.width,
              height: item.image?.height,
            });
          }
        }
      } else {
        // Fallback: scrape Google Images page (less reliable)
        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(productTitle + ' product official')}`;

        const response = await axios.get(searchUrl, {
          headers: { 'User-Agent': this.userAgent },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);

        // Extract image URLs from Google Images results
        $('img').each((i, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');

          if (src && this.isValidImageUrl(src) && !src.includes('google.com/images/branding')) {
            images.push({
              url: src,
              source: 'google-scrape',
            });
          }
        });
      }
    } catch (error: any) {
      console.warn(`   ⚠️  Google Images scrape failed: ${error.message}`);
    }

    return images.slice(0, 3);
  }

  /**
   * Extract brand from product title
   */
  private extractBrand(productTitle: string): string | null {
    const brands = ['Sony', 'Canon', 'Nikon', 'Apple', 'Samsung', 'LG', 'GoPro', 'Bose', 'Yamaha', 'Roland', 'Fender', 'Garmin', 'iRobot', 'Breville', 'Ninja', 'YETI'];

    for (const brand of brands) {
      if (productTitle.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }

    return null;
  }

  /**
   * Check if URL is a valid image URL
   */
  private isValidImageUrl(url: string): boolean {
    if (!url) return false;

    // Must be HTTP(S)
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
      return false;
    }

    // Must have image extension or be from known image CDN
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageCDNs = ['cloudinary.com', 'imgix.net', 'cloudfront.net', 'akamaized.net'];

    const hasExtension = imageExtensions.some(ext => url.toLowerCase().includes(ext));
    const isFromCDN = imageCDNs.some(cdn => url.includes(cdn));

    return hasExtension || isFromCDN;
  }

  /**
   * Normalize image URL (handle relative URLs, protocol-less URLs, etc.)
   */
  private normalizeImageUrl(url: string, baseUrl: string): string {
    // Handle protocol-less URLs
    if (url.startsWith('//')) {
      return 'https:' + url;
    }

    // Handle relative URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const base = new URL(baseUrl);
      return new URL(url, base.origin).toString();
    }

    // Upgrade to larger size if possible
    url = url.replace(/\/w_\d+,/, '/w_1200,'); // Cloudinary
    url = url.replace(/\/h_\d+,/, '/h_1200,'); // Cloudinary
    url = url.replace(/_\d+x\d+\./, '_1200x1200.'); // Generic thumbnails

    return url;
  }

  /**
   * Deduplicate images (remove duplicates and very similar URLs)
   */
  private deduplicateImages(images: ScrapedImage[]): ScrapedImage[] {
    const seen = new Set<string>();
    const unique: ScrapedImage[] = [];

    for (const image of images) {
      // Create a simplified URL for comparison (remove query params and size variants)
      const simplifiedUrl = image.url
        .split('?')[0]
        .replace(/\/w_\d+,/, '/')
        .replace(/\/h_\d+,/, '/')
        .replace(/_\d+x\d+\./, '.');

      if (!seen.has(simplifiedUrl)) {
        seen.add(simplifiedUrl);
        unique.push(image);
      }
    }

    return unique;
  }
}

// Export singleton
export const imageScraper = new ImageScraper();
