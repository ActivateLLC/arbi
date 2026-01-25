import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface VideoMetadata {
  productId: string;
  source: string;
  creatorName?: string;
  viewCount?: number;
  duration?: number;
  tags?: string[];
}

interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  duration: number;
  width: number;
  height: number;
  bytes: number;
}

/**
 * VideoDownloader - Download and upload UGC videos to Cloudinary
 *
 * Features:
 * - Download videos from URLs
 * - Upload to Cloudinary for CDN hosting
 * - Generate thumbnail images
 * - Optimize video quality and size
 * - Tag videos with metadata for organization
 */
export class VideoDownloader {
  private cloudinaryConfigured: boolean = false;
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'arbi-videos');
    this.ensureTempDir();
    this.configureCloudinary();
  }

  /**
   * Configure Cloudinary (if credentials available)
   */
  private configureCloudinary(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.cloudinaryConfigured = true;
      console.log('✅ [VideoDownloader] Cloudinary configured');
    } else {
      console.log('⚠️  [VideoDownloader] Cloudinary not configured - videos will be saved locally');
    }
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Download video from URL
   */
  async downloadVideo(
    videoUrl: string,
    metadata: VideoMetadata
  ): Promise<string> {
    console.log(`⬇️  [VideoDownloader] Downloading: ${videoUrl}`);

    try {
      // Generate filename
      const filename = `${metadata.productId}_${Date.now()}.mp4`;
      const filepath = path.join(this.tempDir, filename);

      // Download video
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 120000, // 2 minute timeout
        maxContentLength: 100 * 1024 * 1024, // 100MB max
      });

      // Save to temp file
      fs.writeFileSync(filepath, response.data);

      const sizeInMB = (response.data.length / (1024 * 1024)).toFixed(2);
      console.log(`✅ [VideoDownloader] Downloaded ${sizeInMB}MB to: ${filepath}`);

      return filepath;
    } catch (error: any) {
      console.error(`❌ [VideoDownloader] Download failed:`, error.message);
      throw error;
    }
  }

  /**
   * Upload video to Cloudinary
   */
  async uploadToCloudinary(
    localPath: string,
    metadata: VideoMetadata
  ): Promise<UploadResult> {
    if (!this.cloudinaryConfigured) {
      throw new Error('Cloudinary not configured - set CLOUDINARY_* environment variables');
    }

    console.log(`☁️  [VideoDownloader] Uploading to Cloudinary: ${localPath}`);

    try {
      const result = await cloudinary.uploader.upload(localPath, {
        resource_type: 'video',
        folder: 'arbi/ugc-videos',
        public_id: `${metadata.productId}_${Date.now()}`,
        tags: [
          'ugc',
          metadata.source,
          metadata.productId,
          ...(metadata.tags || []),
        ],
        context: {
          product_id: metadata.productId,
          source: metadata.source,
          creator: metadata.creatorName || 'unknown',
          view_count: metadata.viewCount?.toString() || '0',
        },
        // Optimization settings
        quality: 'auto:good',
        fetch_format: 'auto',
        // Generate thumbnail
        eager: [
          { width: 640, height: 480, crop: 'fill', format: 'jpg' },
        ],
        eager_async: true,
      });

      console.log(`✅ [VideoDownloader] Uploaded to Cloudinary: ${result.secure_url}`);

      // Clean up local file
      this.deleteLocalFile(localPath);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        duration: result.duration,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error: any) {
      console.error(`❌ [VideoDownloader] Cloudinary upload failed:`, error.message);
      throw error;
    }
  }

  /**
   * Download and upload video in one step
   */
  async downloadAndUpload(
    videoUrl: string,
    metadata: VideoMetadata
  ): Promise<UploadResult | string> {
    try {
      // Download video
      const localPath = await this.downloadVideo(videoUrl, metadata);

      // Upload to Cloudinary if configured
      if (this.cloudinaryConfigured) {
        return await this.uploadToCloudinary(localPath, metadata);
      } else {
        // Return local path if Cloudinary not configured
        console.log(`⚠️  [VideoDownloader] Video saved locally: ${localPath}`);
        return localPath;
      }
    } catch (error: any) {
      console.error(`❌ [VideoDownloader] Process failed:`, error.message);
      throw error;
    }
  }

  /**
   * Download multiple videos in parallel
   */
  async downloadMultipleVideos(
    videos: Array<{ url: string; metadata: VideoMetadata }>,
    maxConcurrent: number = 3
  ): Promise<Array<UploadResult | string>> {
    console.log(`📦 [VideoDownloader] Downloading ${videos.length} videos (max ${maxConcurrent} concurrent)`);

    const results: Array<UploadResult | string> = [];
    const chunks: typeof videos[] = [];

    // Split into chunks for parallel processing
    for (let i = 0; i < videos.length; i += maxConcurrent) {
      chunks.push(videos.slice(i, i + maxConcurrent));
    }

    // Process each chunk
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(v => this.downloadAndUpload(v.url, v.metadata))
      );

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ [VideoDownloader] Failed to download video ${index}:`, result.reason);
        }
      });

      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.sleep(2000);
      }
    }

    console.log(`✅ [VideoDownloader] Downloaded ${results.length}/${videos.length} videos successfully`);
    return results;
  }

  /**
   * Delete local video file
   */
  private deleteLocalFile(filepath: string): void {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`🗑️  [VideoDownloader] Deleted local file: ${filepath}`);
      }
    } catch (error: any) {
      console.error(`⚠️  [VideoDownloader] Failed to delete local file:`, error.message);
    }
  }

  /**
   * Clean up old temp files
   */
  cleanupTempFiles(maxAgeHours: number = 24): void {
    console.log(`🧹 [VideoDownloader] Cleaning up temp files older than ${maxAgeHours} hours`);

    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      let deletedCount = 0;

      files.forEach(file => {
        const filepath = path.join(this.tempDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          this.deleteLocalFile(filepath);
          deletedCount++;
        }
      });

      console.log(`✅ [VideoDownloader] Cleaned up ${deletedCount} old files`);
    } catch (error: any) {
      console.error(`❌ [VideoDownloader] Cleanup failed:`, error.message);
    }
  }

  /**
   * Get video info without downloading
   */
  async getVideoInfo(videoUrl: string): Promise<{ size: number; contentType: string }> {
    try {
      const response = await axios.head(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      return {
        size: parseInt(response.headers['content-length'] || '0'),
        contentType: response.headers['content-type'] || 'unknown',
      };
    } catch (error: any) {
      console.error(`❌ [VideoDownloader] Failed to get video info:`, error.message);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
