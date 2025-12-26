/**
 * Free Background Removal Service
 *
 * Automatically removes backgrounds from product images to create professional
 * transparent PNG images perfect for ads and marketplace listings.
 *
 * Uses @imgly/background-removal - 100% FREE, no API limits, runs locally
 *
 * Features:
 * - AI-powered background removal
 * - No external API calls (runs locally)
 * - No usage limits
 * - High quality results
 * - Fallback if removal fails
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Dynamic import for background removal (it's ESM only)
let removeBackground: any = null;

async function initBackgroundRemoval() {
  if (!removeBackground) {
    try {
      const module = await import('@imgly/background-removal-node');
      removeBackground = module.removeBackground;
      console.log('✅ Background removal initialized');
    } catch (error: any) {
      console.log('⚠️  Background removal not available:', error.message);
    }
  }
  return removeBackground;
}

export interface BackgroundRemovalConfig {
  imageUrl: string;
  outputFormat?: 'png' | 'webp';
  quality?: number; // 0-100
}

export interface BackgroundRemovalResult {
  success: boolean;
  processedImagePath?: string;
  processedImageBase64?: string;
  originalUrl: string;
  error?: string;
}

export class BackgroundRemovalService {
  private readonly tempDir: string;

  constructor() {
    this.tempDir = '/tmp/arbi-bg-removal';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Remove background from product image
   * Returns transparent PNG ready for ads
   */
  async removeBackground(config: BackgroundRemovalConfig): Promise<BackgroundRemovalResult> {
    console.log(`🖼️  Removing background from: ${config.imageUrl}`);

    try {
      // Initialize background removal library
      const bgRemover = await initBackgroundRemoval();

      if (!bgRemover) {
        throw new Error('Background removal library not available');
      }

      // Download image
      const imageBuffer = await this.downloadImage(config.imageUrl);

      // Remove background using AI
      console.log('   🤖 AI processing image...');
      const blob = await bgRemover(imageBuffer, {
        output: {
          format: config.outputFormat || 'png',
          quality: config.quality || 0.9,
        },
      });

      // Convert blob to buffer
      const processedBuffer = Buffer.from(await blob.arrayBuffer());

      // Save to temp file
      const outputFilename = `bg-removed-${Date.now()}.png`;
      const outputPath = path.join(this.tempDir, outputFilename);
      fs.writeFileSync(outputPath, processedBuffer);

      console.log(`   ✅ Background removed: ${outputPath}`);

      return {
        success: true,
        processedImagePath: outputPath,
        processedImageBase64: processedBuffer.toString('base64'),
        originalUrl: config.imageUrl,
      };

    } catch (error: any) {
      console.error(`   ❌ Background removal failed: ${error.message}`);

      return {
        success: false,
        originalUrl: config.imageUrl,
        error: error.message,
      };
    }
  }

  /**
   * Batch process multiple images
   */
  async removeBackgroundBatch(imageUrls: string[]): Promise<BackgroundRemovalResult[]> {
    console.log(`🖼️  Batch processing ${imageUrls.length} images...`);

    const results: BackgroundRemovalResult[] = [];

    for (const url of imageUrls) {
      const result = await this.removeBackground({ imageUrl: url });
      results.push(result);

      // Small delay to avoid overwhelming CPU
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`   ✅ Processed ${successCount}/${imageUrls.length} images successfully`);

    return results;
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
    });
    return Buffer.from(response.data);
  }

  /**
   * Clean up old temporary files
   */
  cleanupTempFiles(olderThanMinutes: number = 60): void {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const ageMinutes = (now - stats.mtimeMs) / 1000 / 60;

        if (ageMinutes > olderThanMinutes) {
          fs.unlinkSync(filePath);
          console.log(`   🗑️  Cleaned up old file: ${file}`);
        }
      }
    } catch (error: any) {
      console.error('   ⚠️  Cleanup failed:', error.message);
    }
  }

  /**
   * Check if background removal is available
   */
  async isAvailable(): Promise<boolean> {
    const bgRemover = await initBackgroundRemoval();
    return !!bgRemover;
  }
}

// Export singleton
export const backgroundRemovalService = new BackgroundRemovalService();
