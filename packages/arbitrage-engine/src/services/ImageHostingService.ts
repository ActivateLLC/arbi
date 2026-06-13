import axios from 'axios';
import crypto from 'crypto';

/**
 * Image Hosting Service
 *
 * Handles downloading product images from source platforms and
 * uploading them to a CDN (Cloudinary) for use in destination listings.
 *
 * This solves the problem of not being able to hotlink images from
 * source platforms (against TOS and images may disappear).
 */

export interface HostedImage {
  originalUrl: string;
  hostedUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  uploadedAt: Date;
}

export interface ImageUploadOptions {
  folder?: string; // Cloudinary folder (e.g., 'dropshipping/ebay')
  tags?: string[]; // Tags for organization
  transformation?: string; // Image transformations (resize, crop, etc.)
}

export class ImageHostingService {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;
  private uploadUrl: string;

  constructor() {
    // Support both CLOUDINARY_URL and individual env vars
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if (cloudinaryUrl) {
      // Parse cloudinary://api_key:api_secret@cloud_name
      const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
      if (match) {
        this.apiKey = match[1];
        this.apiSecret = match[2];
        this.cloudName = match[3];
      } else {
        this.cloudName = '';
        this.apiKey = '';
        this.apiSecret = '';
      }
    } else {
      // Fall back to individual variables
      this.cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
      this.apiKey = process.env.CLOUDINARY_API_KEY || '';
      this.apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    }

    this.uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn('⚠️  Cloudinary credentials not configured. Image hosting will fail.');
      console.warn('   Set CLOUDINARY_URL or individual env vars (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
    }
  }

  /**
   * Download image from URL and upload to Cloudinary
   */
  async uploadFromUrl(imageUrl: string, options: ImageUploadOptions = {}): Promise<HostedImage> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary not configured. Cannot upload images.');
    }

    try {
      // Download image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const imageBuffer = Buffer.from(imageResponse.data);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64Image}`;

      // Generate signature for authenticated upload
      const timestamp = Math.round(Date.now() / 1000);
      const uploadParams: any = {
        timestamp,
        folder: options.folder || 'arbi/dropshipping',
        tags: options.tags?.join(',') || 'dropshipping'
      };

      if (options.transformation) {
        uploadParams.transformation = options.transformation;
      }

      const signature = this.generateSignature(uploadParams);

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', dataUri);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', uploadParams.folder);
      if (uploadParams.tags) {
        formData.append('tags', uploadParams.tags);
      }

      const uploadResponse = await axios.post(this.uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });

      const result = uploadResponse.data;

      return {
        originalUrl: imageUrl,
        hostedUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        uploadedAt: new Date()
      };
    } catch (error: any) {
      console.error('❌ Failed to upload image:', imageUrl);
      console.error('   Error:', error.message);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images from URLs
   */
  async uploadMultipleFromUrls(
    imageUrls: string[],
    options: ImageUploadOptions = {}
  ): Promise<HostedImage[]> {
    console.log(`📸 Uploading ${imageUrls.length} images to CDN...`);

    const results: HostedImage[] = [];
    const errors: string[] = [];

    // Upload in parallel with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < imageUrls.length; i += concurrency) {
      const batch = imageUrls.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(url => this.uploadFromUrl(url, options))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const url = batch[index];
          errors.push(`${url}: ${result.reason.message}`);
        }
      });
    }

    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} images failed to upload:`);
      errors.forEach(err => console.warn(`   ${err}`));
    }

    console.log(`✅ Successfully uploaded ${results.length}/${imageUrls.length} images`);

    return results;
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = this.generateSignature({
        public_id: publicId,
        timestamp
      });

      const deleteUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;

      const response = await axios.post(deleteUrl, {
        public_id: publicId,
        api_key: this.apiKey,
        timestamp,
        signature
      });

      return response.data.result === 'ok';
    } catch (error: any) {
      console.error('❌ Failed to delete image:', publicId, error.message);
      return false;
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(publicIds: string[]): Promise<number> {
    const results = await Promise.allSettled(
      publicIds.map(id => this.deleteImage(id))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`🗑️  Deleted ${successCount}/${publicIds.length} images`);

    return successCount;
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedUrl(hostedUrl: string, options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'jpg' | 'png' | 'webp';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  } = {}): string {
    // Parse Cloudinary URL
    const urlParts = hostedUrl.split('/upload/');
    if (urlParts.length !== 2) {
      return hostedUrl; // Not a Cloudinary URL
    }

    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);
    if (options.crop) transformations.push(`c_${options.crop}`);

    const transformString = transformations.join(',');
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
  }

  /**
   * Generate Cloudinary API signature
   */
  private generateSignature(params: Record<string, any>): string {
    // Sort params alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringToSign = `${sortedParams}${this.apiSecret}`;

    return crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * Check if Cloudinary is configured
   */
  private isConfigured(): boolean {
    return !!(this.cloudName && this.apiKey && this.apiSecret);
  }

  /**
   * Get usage stats (optional - requires admin API)
   */
  async getUsageStats(): Promise<{
    used: number;
    limit: number;
    percentage: number;
  } | null> {
    // This would require Admin API credentials
    // For now, just return null
    // In production, you'd call Cloudinary Admin API
    return null;
  }
}

export default ImageHostingService;
