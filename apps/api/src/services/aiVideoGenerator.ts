/**
 * AI Video Ad Generator
 *
 * Automatically generates engaging video ads from product images
 * Supports multiple AI video generation platforms:
 * - Runway ML (best quality, AI-powered)
 * - Google auto-generated videos (built into Performance Max)
 * - FFmpeg fallback (simple slideshow with motion effects)
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VideoGenerationConfig {
  productTitle: string;
  productDescription: string;
  productImages: string[]; // URLs to product images
  brandName?: string;
  duration?: number; // Duration in seconds (default: 15)
  aspectRatio?: '16:9' | '9:16' | '1:1'; // Landscape, Portrait, Square
  style?: 'modern' | 'elegant' | 'energetic' | 'minimal';
}

export interface GeneratedVideo {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  provider: 'runway' | 'google' | 'ffmpeg';
  error?: string;
}

export class AIVideoGenerator {
  private readonly runwayApiKey: string | undefined;
  private readonly tempDir: string;

  constructor() {
    this.runwayApiKey = process.env.RUNWAY_API_KEY;
    this.tempDir = '/tmp/arbi-videos';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate video ad using the best available method
   */
  async generateVideoAd(config: VideoGenerationConfig): Promise<GeneratedVideo> {
    console.log(`🎬 Generating AI video ad for: ${config.productTitle}`);

    // Try Runway ML first (best quality)
    if (this.runwayApiKey) {
      try {
        return await this.generateWithRunway(config);
      } catch (error: any) {
        console.error(`   ❌ Runway ML failed: ${error.message}`);
        console.log(`   🔄 Falling back to FFmpeg...`);
      }
    }

    // Fallback to FFmpeg (reliable, works offline)
    try {
      return await this.generateWithFFmpeg(config);
    } catch (error: any) {
      console.error(`   ❌ FFmpeg failed: ${error.message}`);
      return {
        success: false,
        provider: 'ffmpeg',
        error: error.message,
      };
    }
  }

  /**
   * Generate video using Runway ML Gen-3 API
   * Docs: https://docs.runwayml.com/
   */
  private async generateWithRunway(config: VideoGenerationConfig): Promise<GeneratedVideo> {
    console.log('   🚀 Using Runway ML Gen-3 for AI video generation...');

    const duration = config.duration || 15;
    const aspectRatio = config.aspectRatio || '16:9';

    // Create AI video generation prompt
    const prompt = this.createVideoPrompt(config);

    // Step 1: Generate video from first product image
    const response = await axios.post(
      'https://api.runwayml.com/v1/generate',
      {
        model: 'gen3a_turbo', // Fastest, cheapest Gen-3 model
        prompt,
        image: config.productImages[0], // Start from product image
        duration,
        aspect_ratio: aspectRatio,
        watermark: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.runwayApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const taskId = response.data.id;

    // Step 2: Poll for completion
    let videoUrl: string | undefined;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await axios.get(
        `https://api.runwayml.com/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.runwayApiKey}`,
          },
        }
      );

      const status = statusResponse.data.status;

      if (status === 'SUCCEEDED') {
        videoUrl = statusResponse.data.output[0];
        break;
      } else if (status === 'FAILED') {
        throw new Error(`Runway ML generation failed: ${statusResponse.data.failure_reason}`);
      }

      attempts++;
      console.log(`   ⏳ Generating... (${attempts * 5}s elapsed)`);
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    console.log(`   ✅ Runway ML video generated: ${videoUrl}`);

    return {
      success: true,
      videoUrl,
      duration,
      provider: 'runway',
    };
  }

  /**
   * Generate video using FFmpeg (simple slideshow with effects)
   * Fast, reliable, works offline, FREE
   */
  private async generateWithFFmpeg(config: VideoGenerationConfig): Promise<GeneratedVideo> {
    console.log('   🎬 Using FFmpeg for video generation (free, fast)...');

    const duration = config.duration || 15;
    const aspectRatio = config.aspectRatio || '16:9';

    // Determine video dimensions
    const dimensions = aspectRatio === '16:9' ? '1920:1080' :
                      aspectRatio === '9:16' ? '1080:1920' :
                      '1080:1080';

    const outputFilename = `video_${Date.now()}.mp4`;
    const outputPath = path.join(this.tempDir, outputFilename);

    // Download product images
    const imagePaths: string[] = [];
    for (let i = 0; i < Math.min(3, config.productImages.length); i++) {
      const imagePath = path.join(this.tempDir, `img_${Date.now()}_${i}.jpg`);
      await this.downloadImage(config.productImages[i], imagePath);
      imagePaths.push(imagePath);
    }

    if (imagePaths.length === 0) {
      throw new Error('No product images available');
    }

    // Create video with FFmpeg
    // Uses Ken Burns effect (zoom + pan) for dynamic feel
    const durationPerImage = duration / imagePaths.length;

    try {
      if (imagePaths.length === 1) {
        // Single image: zoom in effect
        await execAsync(
          `ffmpeg -loop 1 -i "${imagePaths[0]}" ` +
          `-vf "scale=${dimensions}:force_original_aspect_ratio=decrease,` +
          `pad=${dimensions}:(ow-iw)/2:(oh-ih)/2,` +
          `zoompan=z='min(zoom+0.0015,1.5)':d=${duration * 25}:s=${dimensions.replace(':', 'x')}" ` +
          `-t ${duration} -c:v libx264 -pix_fmt yuv420p "${outputPath}"`
        );
      } else {
        // Multiple images: slideshow with crossfade
        const inputs = imagePaths.map(p => `-loop 1 -t ${durationPerImage} -i "${p}"`).join(' ');
        const filterComplex = this.buildCrossfadeFilter(imagePaths.length, durationPerImage, dimensions);

        await execAsync(
          `ffmpeg ${inputs} -filter_complex "${filterComplex}" ` +
          `-c:v libx264 -pix_fmt yuv420p "${outputPath}"`
        );
      }

      console.log(`   ✅ FFmpeg video generated: ${outputPath}`);

      // In production, upload to Cloudinary or S3
      // For now, return local path (you'll need to upload this)
      const videoUrl = await this.uploadVideo(outputPath);

      // Cleanup temp files
      imagePaths.forEach(p => fs.unlinkSync(p));

      return {
        success: true,
        videoUrl,
        duration,
        provider: 'ffmpeg',
      };

    } catch (error: any) {
      // Cleanup on error
      imagePaths.forEach(p => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      throw error;
    }
  }

  /**
   * Create AI video generation prompt
   */
  private createVideoPrompt(config: VideoGenerationConfig): string {
    const style = config.style || 'modern';

    const stylePrompts: { [key: string]: string } = {
      modern: 'sleek, minimalist, clean white background, professional product photography, smooth camera movement',
      elegant: 'luxury, premium feel, soft lighting, elegant transitions, sophisticated ambiance',
      energetic: 'dynamic, fast-paced, vibrant colors, quick cuts, exciting motion',
      minimal: 'simple, clean, white background, subtle movement, focus on product details',
    };

    return `Professional product showcase video for ${config.productTitle}. ` +
           `${stylePrompts[style]}. ` +
           `The product rotates slowly showing all angles. ` +
           `Cinematic quality, 4K resolution, perfect lighting. ` +
           `Brand: ${config.brandName || 'Arbi'}`;
  }

  /**
   * Build FFmpeg crossfade filter for smooth transitions
   */
  private buildCrossfadeFilter(imageCount: number, duration: number, dimensions: string): string {
    if (imageCount === 1) {
      return `scale=${dimensions}:force_original_aspect_ratio=decrease,pad=${dimensions}:(ow-iw)/2:(oh-ih)/2`;
    }

    const fadeDuration = 1; // 1 second crossfade
    let filter = '';

    for (let i = 0; i < imageCount; i++) {
      filter += `[${i}:v]scale=${dimensions}:force_original_aspect_ratio=decrease,` +
                `pad=${dimensions}:(ow-iw)/2:(oh-ih)/2,` +
                `setsar=1,format=yuv420p[v${i}];`;
    }

    // Chain crossfades
    for (let i = 0; i < imageCount - 1; i++) {
      const input1 = i === 0 ? 'v0' : `f${i - 1}`;
      const input2 = `v${i + 1}`;
      const offset = duration - fadeDuration;
      filter += `[${input1}][${input2}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset}[f${i}];`;
    }

    return filter.slice(0, -1); // Remove trailing semicolon
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string, outputPath: string): Promise<void> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
  }

  /**
   * Upload video to Cloudinary
   */
  private async uploadVideo(filePath: string): Promise<string> {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.log('   ⚠️  Cloudinary not configured, returning local path');
      return filePath; // Return local path as fallback
    }

    try {
      const cloudinary = require('cloudinary').v2;

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video',
        folder: 'arbi/product-videos',
      });

      console.log(`   ✅ Video uploaded to Cloudinary: ${result.secure_url}`);

      // Delete local file after upload
      fs.unlinkSync(filePath);

      return result.secure_url;
    } catch (error: any) {
      console.error(`   ❌ Cloudinary upload failed: ${error.message}`);
      console.log(`   ℹ️  Returning local path instead`);
      return filePath;
    }
  }

  /**
   * Check if video generation is configured
   */
  isConfigured(): boolean {
    return !!(this.runwayApiKey || this.isFFmpegAvailable());
  }

  /**
   * Check if FFmpeg is installed
   */
  private isFFmpegAvailable(): boolean {
    try {
      require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate multiple video variations for A/B testing
   */
  async generateVariations(config: VideoGenerationConfig): Promise<GeneratedVideo[]> {
    const styles: Array<'modern' | 'elegant' | 'energetic' | 'minimal'> = ['modern', 'elegant', 'energetic'];
    const videos: GeneratedVideo[] = [];

    for (const style of styles) {
      try {
        const video = await this.generateVideoAd({ ...config, style });
        if (video.success) {
          videos.push(video);
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to generate ${style} variation: ${error.message}`);
      }
    }

    return videos;
  }
}

// Export singleton
export const aiVideoGenerator = new AIVideoGenerator();
