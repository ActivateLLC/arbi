import axios from 'axios';
import * as cheerio from 'cheerio';
import { ImageHostingService, HostedImage } from './ImageHostingService';

/**
 * Photo Extraction Service
 *
 * Extracts all product photos from various e-commerce platforms
 * and uploads them to CDN for use in destination listings.
 *
 * Supports: eBay, Amazon, Walmart, Mercari, Poshmark, etc.
 */

export interface ExtractedProductData {
  title: string;
  description: string;
  images: HostedImage[];
  condition: string;
  specs?: Record<string, string>;
  upc?: string;
  brand?: string;
  mpn?: string;
  originalUrl: string;
  platform: 'ebay' | 'amazon' | 'walmart' | 'mercari' | 'other';
}

export class PhotoExtractionService {
  private imageHosting: ImageHostingService;

  constructor() {
    this.imageHosting = new ImageHostingService();
  }

  /**
   * Extract product data from any platform URL
   */
  async extractProductData(url: string): Promise<ExtractedProductData> {
    const platform = this.detectPlatform(url);

    console.log(`📦 Extracting product data from ${platform}: ${url}`);

    switch (platform) {
      case 'ebay':
        return this.extractFromEbay(url);
      case 'amazon':
        return this.extractFromAmazon(url);
      case 'walmart':
        return this.extractFromWalmart(url);
      case 'mercari':
        return this.extractFromMercari(url);
      default:
        return this.extractGeneric(url);
    }
  }

  /**
   * Extract from eBay listing
   */
  private async extractFromEbay(url: string): Promise<ExtractedProductData> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Extract title
      const title = $('h1.x-item-title__mainTitle').text().trim() ||
                    $('.it-ttl').text().trim();

      // Extract images
      const imageUrls: string[] = [];

      // Method 1: High-res images from picture panel
      $('#vi_main_img_fs img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !imageUrls.includes(src)) {
          imageUrls.push(src);
        }
      });

      // Method 2: Thumbnail images
      $('.tdThumb img').each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
          // Convert thumbnail to full size
          const fullSrc = src.replace(/s-l\d+/g, 's-l1600');
          if (!imageUrls.includes(fullSrc)) {
            imageUrls.push(fullSrc);
          }
        }
      });

      // Method 3: Main image
      const mainImg = $('#icImg').attr('src');
      if (mainImg && !imageUrls.includes(mainImg)) {
        imageUrls.unshift(mainImg); // Add as first image
      }

      // Extract description
      const description = $('#desc_div').text().trim() ||
                         $('.ds_div').text().trim() ||
                         $('[data-testid="x-item-description"]').text().trim();

      // Extract condition
      const condition = $('.x-item-condition-text .ux-textspans').text().trim() ||
                       $('.vi-acc-del-range-2').text().trim() ||
                       'Used';

      // Extract specs
      const specs: Record<string, string> = {};
      $('.ux-labels-values__labels').each((i, el) => {
        const label = $(el).text().trim();
        const value = $(el).next('.ux-labels-values__values').text().trim();
        if (label && value) {
          specs[label] = value;
        }
      });

      // Extract UPC/Brand/MPN
      const upc = specs['UPC'] || specs['EAN'] || undefined;
      const brand = specs['Brand'] || undefined;
      const mpn = specs['MPN'] || specs['Manufacturer Part Number'] || undefined;

      // Upload images to CDN
      console.log(`📸 Found ${imageUrls.length} images, uploading to CDN...`);
      const hostedImages = await this.imageHosting.uploadMultipleFromUrls(imageUrls, {
        folder: 'arbi/ebay',
        tags: ['ebay', 'dropshipping']
      });

      return {
        title,
        description,
        images: hostedImages,
        condition: this.normalizeCondition(condition),
        specs,
        upc,
        brand,
        mpn,
        originalUrl: url,
        platform: 'ebay'
      };
    } catch (error: any) {
      console.error('❌ Failed to extract from eBay:', error.message);
      throw new Error(`eBay extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract from Amazon listing
   */
  private async extractFromAmazon(url: string): Promise<ExtractedProductData> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Extract title
      const title = $('#productTitle').text().trim();

      // Extract images
      const imageUrls: string[] = [];

      // Method 1: Image thumbnails
      $('#altImages img').each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
          // Convert thumbnail to full size
          const fullSrc = src.replace(/\._.*_\./, '.');
          if (!imageUrls.includes(fullSrc)) {
            imageUrls.push(fullSrc);
          }
        }
      });

      // Method 2: Main image
      const mainImg = $('#landingImage').attr('src');
      if (mainImg && !imageUrls.includes(mainImg)) {
        imageUrls.unshift(mainImg);
      }

      // Extract description
      const description = $('#feature-bullets').text().trim() +
                         '\n\n' +
                         $('#productDescription').text().trim();

      // Extract condition (most Amazon items are new)
      const condition = $('#newBuyBoxPrice').length > 0 ? 'New' : 'Used';

      // Extract specs
      const specs: Record<string, string> = {};
      $('#productDetails_detailBullets_sections1 tr').each((i, el) => {
        const label = $(el).find('th').text().trim();
        const value = $(el).find('td').text().trim();
        if (label && value) {
          specs[label] = value;
        }
      });

      // Upload images
      console.log(`📸 Found ${imageUrls.length} images, uploading to CDN...`);
      const hostedImages = await this.imageHosting.uploadMultipleFromUrls(imageUrls, {
        folder: 'arbi/amazon',
        tags: ['amazon', 'dropshipping']
      });

      return {
        title,
        description,
        images: hostedImages,
        condition: this.normalizeCondition(condition),
        specs,
        upc: specs['UPC'],
        brand: specs['Brand'],
        mpn: specs['Part Number'],
        originalUrl: url,
        platform: 'amazon'
      };
    } catch (error: any) {
      console.error('❌ Failed to extract from Amazon:', error.message);
      throw new Error(`Amazon extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract from Walmart listing
   */
  private async extractFromWalmart(url: string): Promise<ExtractedProductData> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Walmart uses React/dynamic rendering, may need Puppeteer
      // For now, attempt to parse static HTML

      const title = $('h1[itemprop="name"]').text().trim() ||
                   $('.prod-ProductTitle').text().trim();

      // Images are usually in a JSON-LD script tag
      const imageUrls: string[] = [];
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          if (json.image) {
            if (Array.isArray(json.image)) {
              imageUrls.push(...json.image);
            } else {
              imageUrls.push(json.image);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      const description = $('[itemprop="description"]').text().trim();
      const condition = 'New'; // Walmart primarily sells new items

      // Upload images
      const hostedImages = await this.imageHosting.uploadMultipleFromUrls(imageUrls, {
        folder: 'arbi/walmart',
        tags: ['walmart', 'dropshipping']
      });

      return {
        title,
        description,
        images: hostedImages,
        condition,
        originalUrl: url,
        platform: 'walmart'
      };
    } catch (error: any) {
      console.error('❌ Failed to extract from Walmart:', error.message);
      throw new Error(`Walmart extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract from Mercari listing
   */
  private async extractFromMercari(url: string): Promise<ExtractedProductData> {
    // Mercari uses heavy JavaScript rendering, would need Puppeteer
    // For now, return basic structure
    throw new Error('Mercari extraction requires Puppeteer (dynamic rendering)');
  }

  /**
   * Generic extraction for unknown platforms
   */
  private async extractGeneric(url: string): Promise<ExtractedProductData> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Try common title selectors
      const title = $('h1').first().text().trim() ||
                   $('[itemprop="name"]').text().trim() ||
                   $('title').text().trim();

      // Try to find all images
      const imageUrls: string[] = [];
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('product') || src.includes('item') || $(el).hasClass('product-image'))) {
          if (!imageUrls.includes(src)) {
            imageUrls.push(src);
          }
        }
      });

      const description = $('[itemprop="description"]').text().trim() ||
                         $('.description').text().trim() ||
                         $('meta[name="description"]').attr('content') || '';

      // Upload images
      const hostedImages = await this.imageHosting.uploadMultipleFromUrls(imageUrls, {
        folder: 'arbi/generic',
        tags: ['dropshipping']
      });

      return {
        title,
        description,
        images: hostedImages,
        condition: 'Used',
        originalUrl: url,
        platform: 'other'
      };
    } catch (error: any) {
      console.error('❌ Generic extraction failed:', error.message);
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): 'ebay' | 'amazon' | 'walmart' | 'mercari' | 'other' {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('ebay.')) return 'ebay';
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('walmart.')) return 'walmart';
    if (hostname.includes('mercari.')) return 'mercari';

    return 'other';
  }

  /**
   * Normalize condition string
   */
  private normalizeCondition(condition: string): string {
    const lower = condition.toLowerCase();

    if (lower.includes('new') || lower.includes('brand new')) return 'new';
    if (lower.includes('refurb')) return 'refurbished';
    if (lower.includes('used') || lower.includes('pre-owned')) return 'used';
    if (lower.includes('open box')) return 'open_box';

    return 'used'; // Default
  }

  /**
   * Clean up hosted images when listing is removed
   */
  async cleanupImages(images: HostedImage[]): Promise<void> {
    const publicIds = images.map(img => img.publicId);
    await this.imageHosting.deleteMultipleImages(publicIds);
  }
}

export default PhotoExtractionService;
