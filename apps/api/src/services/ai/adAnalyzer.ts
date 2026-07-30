/**
 * Ad Analyzer Service
 * Analyzes successful video ads using Claude Vision API
 * Extracts structure, timing, hooks, colors, and design patterns
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import fs from 'fs';

export interface AdAnalysis {
  hook: {
    text: string;
    timing: string; // e.g., "0-1.5s"
    style: string; // Font, size, position
  };
  scenes: Array<{
    timing: string;
    description: string;
    textOverlay?: string;
    visualElements: string[];
  }>;
  design: {
    colorPalette: string[];
    fontStyle: string;
    textPosition: string; // e.g., "bottom-third", "center"
    captionStyle: string;
  };
  pacing: {
    totalDuration: number;
    averageSceneDuration: number;
    cutStyle: string; // "fast", "medium", "slow"
  };
  effectiveness: {
    hookQuality: number; // 1-10
    visualAppeal: number; // 1-10
    clarity: number; // 1-10
    platformOptimization: string; // "TikTok", "Instagram", "YouTube"
  };
  replicationGuide: {
    keyElements: string[];
    timing: string;
    textStrategy: string;
    visualStrategy: string;
  };
}

/**
 * Analyze a video ad using Claude Vision
 */
export async function analyzeVideoAd(
  videoUrlOrPath: string,
  context?: {
    productCategory?: string;
    platform?: string;
    objective?: string;
  }
): Promise<AdAnalysis> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('🔍 Analyzing video ad with Claude Vision...');

  // Download video if URL
  let videoPath = videoUrlOrPath;
  if (videoUrlOrPath.startsWith('http')) {
    videoPath = await downloadVideo(videoUrlOrPath);
  }

  // Extract frames at key intervals (0s, 3s, 6s, 9s, 12s, 15s)
  const frames = await extractFrames(videoPath, [0, 3, 6, 9, 12, 15]);

  // Convert frames to base64
  const frameImages = frames.map(framePath => {
    const imageData = fs.readFileSync(framePath);
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data: imageData.toString('base64'),
      },
    };
  });

  const prompt = buildAnalysisPrompt(context);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            ...frameImages,
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    return parseAnalysis(responseText);
  } catch (error: any) {
    console.error('❌ Video analysis failed:', error.message);
    throw new Error(`Video analysis failed: ${error.message}`);
  } finally {
    // Clean up temporary files
    frames.forEach(frame => {
      if (fs.existsSync(frame)) fs.unlinkSync(frame);
    });
    if (videoPath !== videoUrlOrPath && fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
  }
}

/**
 * Build the analysis prompt for Claude
 */
function buildAnalysisPrompt(context?: {
  productCategory?: string;
  platform?: string;
  objective?: string;
}): string {
  return `You are an expert video ad analyst. Analyze this video ad frame-by-frame and provide a detailed breakdown.

${context?.productCategory ? `Product Category: ${context.productCategory}` : ''}
${context?.platform ? `Platform: ${context.platform}` : ''}
${context?.objective ? `Objective: ${context.objective}` : ''}

I'm showing you 6 frames from a video ad at 3-second intervals (0s, 3s, 6s, 9s, 12s, 15s).

Analyze and extract:

1. **Hook** (First 0-2 seconds):
   - Exact text shown
   - Visual style (font size, color, position)
   - Attention-grabbing technique used

2. **Scene Breakdown**:
   - What happens in each 3-second interval
   - Text overlays shown
   - Visual elements (product shots, backgrounds, animations)

3. **Design System**:
   - Color palette (list hex codes if possible)
   - Font style (bold, sans-serif, etc.)
   - Text positioning (top, center, bottom)
   - Caption/subtitle style

4. **Pacing**:
   - How fast do scenes change?
   - Is it fast-paced, medium, or slow?
   - How long is each text overlay shown?

5. **Effectiveness Rating**:
   - Hook quality (1-10)
   - Visual appeal (1-10)
   - Message clarity (1-10)
   - Which platform is this optimized for?

6. **Replication Guide**:
   - What are the 3-5 key elements that make this ad work?
   - Exact timing recommendations
   - Text strategy (what to say when)
   - Visual strategy (what to show when)

Return your analysis as a JSON object with this structure:
{
  "hook": {
    "text": "...",
    "timing": "0-1.5s",
    "style": "Large bold text, white color, bottom position"
  },
  "scenes": [
    {
      "timing": "0-3s",
      "description": "...",
      "textOverlay": "...",
      "visualElements": ["product image", "gradient background"]
    }
  ],
  "design": {
    "colorPalette": ["#FF6B6B", "#4ECDC4"],
    "fontStyle": "Bold sans-serif, all caps",
    "textPosition": "bottom-third",
    "captionStyle": "White text on black background"
  },
  "pacing": {
    "totalDuration": 15,
    "averageSceneDuration": 2.5,
    "cutStyle": "fast"
  },
  "effectiveness": {
    "hookQuality": 9,
    "visualAppeal": 8,
    "clarity": 10,
    "platformOptimization": "TikTok/Instagram Reels"
  },
  "replicationGuide": {
    "keyElements": ["Bold hook in first 1s", "Price reveal at 3s", "3 benefits shown quickly"],
    "timing": "Hook: 0-1.5s, Product: 1.5-4s, Benefits: 4-12s, CTA: 12-15s",
    "textStrategy": "Start with question/exclamation, show price early, keep text large and readable",
    "visualStrategy": "Use gradient backgrounds, show product clearly, fast transitions"
  }
}

Be specific and actionable. Focus on elements we can replicate.`;
}

/**
 * Parse Claude's analysis response
 */
function parseAnalysis(responseText: string): AdAnalysis {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in analysis response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    console.error('⚠️  Failed to parse analysis, using fallback');

    // Return a basic fallback analysis
    return {
      hook: {
        text: 'Unknown',
        timing: '0-2s',
        style: 'Bold text, center position',
      },
      scenes: [
        {
          timing: '0-5s',
          description: 'Opening scene',
          visualElements: ['Product showcase'],
        },
        {
          timing: '5-10s',
          description: 'Benefits',
          visualElements: ['Text overlays'],
        },
        {
          timing: '10-15s',
          description: 'Call to action',
          visualElements: ['CTA button'],
        },
      ],
      design: {
        colorPalette: ['#000000', '#FFFFFF'],
        fontStyle: 'Bold sans-serif',
        textPosition: 'center',
        captionStyle: 'Bottom captions',
      },
      pacing: {
        totalDuration: 15,
        averageSceneDuration: 5,
        cutStyle: 'medium',
      },
      effectiveness: {
        hookQuality: 7,
        visualAppeal: 7,
        clarity: 7,
        platformOptimization: 'General',
      },
      replicationGuide: {
        keyElements: ['Clear hook', 'Product showcase', 'Call to action'],
        timing: 'Standard 15s format',
        textStrategy: 'Keep text simple and readable',
        visualStrategy: 'Show product clearly',
      },
    };
  }
}

/**
 * Download video from URL
 */
async function downloadVideo(url: string): Promise<string> {
  const tempPath = `/tmp/ad-video-${Date.now()}.mp4`;

  console.log(`   📥 Downloading video from ${url}...`);

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(tempPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(`   ✅ Video downloaded to ${tempPath}`);
      resolve(tempPath);
    });
    writer.on('error', reject);
  });
}

/**
 * Extract frames from video at specific timestamps
 */
async function extractFrames(
  videoPath: string,
  timestamps: number[]
): Promise<string[]> {
  const { execSync } = require('child_process');
  const framePaths: string[] = [];

  console.log(`   🎞️  Extracting ${timestamps.length} frames...`);

  for (const ts of timestamps) {
    const framePath = `/tmp/frame-${ts}s-${Date.now()}.jpg`;

    try {
      // Use ffmpeg to extract frame at timestamp
      execSync(
        `ffmpeg -ss ${ts} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y`,
        { stdio: 'ignore' }
      );

      framePaths.push(framePath);
    } catch (error) {
      console.warn(`⚠️  Failed to extract frame at ${ts}s`);
    }
  }

  console.log(`   ✅ Extracted ${framePaths.length} frames`);
  return framePaths;
}

/**
 * Analyze multiple ads and find common patterns
 */
export async function analyzeBatch(
  videoUrls: string[],
  context?: { productCategory?: string }
): Promise<{
  individualAnalyses: AdAnalysis[];
  commonPatterns: {
    averageHookTiming: string;
    mostCommonColors: string[];
    averagePacing: string;
    keySuccessFactors: string[];
  };
}> {
  const analyses: AdAnalysis[] = [];

  for (const url of videoUrls) {
    try {
      const analysis = await analyzeVideoAd(url, context);
      analyses.push(analysis);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ Failed to analyze ${url}:`, error.message);
    }
  }

  // Find common patterns
  const commonPatterns = extractCommonPatterns(analyses);

  return {
    individualAnalyses: analyses,
    commonPatterns,
  };
}

/**
 * Extract common patterns from multiple analyses
 */
function extractCommonPatterns(analyses: AdAnalysis[]): {
  averageHookTiming: string;
  mostCommonColors: string[];
  averagePacing: string;
  keySuccessFactors: string[];
} {
  if (analyses.length === 0) {
    return {
      averageHookTiming: '0-2s',
      mostCommonColors: [],
      averagePacing: 'medium',
      keySuccessFactors: [],
    };
  }

  // Calculate average hook timing
  const avgHookEnd =
    analyses.reduce((sum, a) => {
      const match = a.hook.timing.match(/(\d+\.?\d*)-(\d+\.?\d*)s/);
      return sum + (match ? parseFloat(match[2]) : 2);
    }, 0) / analyses.length;

  // Find most common colors
  const allColors = analyses.flatMap(a => a.design.colorPalette);
  const colorCounts = allColors.reduce((acc, color) => {
    acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color]) => color);

  // Calculate average pacing
  const avgSceneDuration =
    analyses.reduce((sum, a) => sum + a.pacing.averageSceneDuration, 0) /
    analyses.length;

  const averagePacing =
    avgSceneDuration < 3 ? 'fast' : avgSceneDuration < 5 ? 'medium' : 'slow';

  // Extract key success factors
  const allKeyElements = analyses.flatMap(
    a => a.replicationGuide.keyElements
  );
  const elementCounts = allKeyElements.reduce((acc, elem) => {
    const normalized = elem.toLowerCase();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const keySuccessFactors = Object.entries(elementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([factor]) => factor);

  return {
    averageHookTiming: `0-${avgHookEnd.toFixed(1)}s`,
    mostCommonColors,
    averagePacing,
    keySuccessFactors,
  };
}
