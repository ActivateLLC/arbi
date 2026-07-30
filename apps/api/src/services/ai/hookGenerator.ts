/**
 * AI Hook Generator
 * Creates scroll-stopping video ad hooks using GPT-4
 * Following 2026 UGC best practices
 */

import Anthropic from '@anthropic-ai/sdk';

export interface HookGenerationOptions {
  productTitle: string;
  productCategory?: string;
  price: number;
  originalPrice?: number;
  keyBenefit?: string;
  targetAudience?: string;
  format: 'deal-discovery' | 'problem-solution' | 'gift-idea' | 'day-in-life';
}

export interface GeneratedHooks {
  primaryHook: string;
  benefits: string[];
  captions: string[];
  format: string;
}

/**
 * Generate modern UGC-style hooks and ad copy
 */
export async function generateVideoHooks(
  options: HookGenerationOptions
): Promise<GeneratedHooks> {
  const {
    productTitle,
    productCategory,
    price,
    originalPrice,
    keyBenefit,
    targetAudience,
    format,
  } = options;

  const savings = originalPrice ? originalPrice - price : 0;
  const savingsPercent = originalPrice ? Math.round((savings / originalPrice) * 100) : 0;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = buildPrompt(options, savingsPercent);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    return parseHookResponse(responseText, format);
  } catch (error: any) {
    console.error('❌ Hook generation failed:', error.message);

    // Fallback to template-based hooks
    return generateFallbackHooks(options, savingsPercent);
  }
}

/**
 * Build the prompt for hook generation
 */
function buildPrompt(options: HookGenerationOptions, savingsPercent: number): string {
  const { productTitle, price, originalPrice, format, targetAudience } = options;

  const formatInstructions: Record<string, string> = {
    'deal-discovery': 'Focus on the amazing deal/price discovery angle. Make it feel like finding a hidden gem.',
    'problem-solution': 'Start with a relatable problem, then reveal this product as the perfect solution.',
    'gift-idea': 'Position this as the perfect gift that will make someone\'s day. Emotional and thoughtful.',
    'day-in-life': 'Show how this product fits into everyday life naturally. Authentic and relatable.',
  };

  return `You are a viral UGC content creator who creates scroll-stopping video ad hooks for TikTok and Instagram Reels.

Your task: Create a 15-second video ad script for this product.

Product: ${productTitle}
Price: $${price}
${originalPrice ? `Original Price: $${originalPrice} (${savingsPercent}% savings!)` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
Format: ${format}
${formatInstructions[format]}

CRITICAL RULES FOR 2026 UGC ADS:
1. Hook must stop scrolling in 0.5 seconds - use pattern interrupts
2. Be authentic and conversational - NOT corporate or salesy
3. Use emojis naturally (but not excessively)
4. Short sentences. Punchy. Casual.
5. Create curiosity and emotion
6. Sound like a friend sharing a discovery, not an advertiser
7. Include "wait", "okay but", "POV", "no one talks about", or similar UGC phrases

Return ONLY a JSON object with this exact structure:
{
  "hook": "The opening line (2-5 words max, attention-grabbing)",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "captions": ["Scene 1 caption", "Scene 2 caption", "Scene 3 caption", "Scene 4 caption"]
}

Example hook styles:
- "Wait... WHAT? 😱"
- "Okay but hear me out..."
- "No one talks about this..."
- "POV: You just found..."
- "Tell me why I just..."

Make it AUTHENTIC and scroll-stopping. No corporate language.`;
}

/**
 * Parse Claude's response into structured hooks
 */
function parseHookResponse(responseText: string, format: string): GeneratedHooks {
  try {
    // Extract JSON from response (Claude sometimes adds explanation before/after)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      primaryHook: parsed.hook || "Wait... you NEED this! 😱",
      benefits: parsed.benefits || [
        "Premium quality",
        "Best price online",
        "Fast shipping",
      ],
      captions: parsed.captions || [
        "Wait... you need to see this! 😱",
        "This is actually crazy good...",
        "Here's why everyone's buying it:",
        "Link in bio! Don't miss out 👆",
      ],
      format,
    };
  } catch (error) {
    console.warn('⚠️  Failed to parse hook response, using fallback');
    return generateFallbackHooks({ format } as any, 0);
  }
}

/**
 * Generate fallback hooks using templates
 */
function generateFallbackHooks(
  options: HookGenerationOptions,
  savingsPercent: number
): GeneratedHooks {
  const templates: Record<string, GeneratedHooks> = {
    'deal-discovery': {
      primaryHook: `Wait... ${savingsPercent}% OFF?! 😱`,
      benefits: [
        "Insane deal on this",
        "Way cheaper than retail",
        "Limited stock available",
      ],
      captions: [
        "I can't believe this price! 😱",
        "Same product, way less money",
        "Here's what you're getting:",
        "Get yours before it's gone! 👆",
      ],
      format: 'deal-discovery',
    },
    'problem-solution': {
      primaryHook: "Okay but FINALLY... ✨",
      benefits: [
        "Solves the problem instantly",
        "Works exactly as promised",
        "Can't live without it now",
      ],
      captions: [
        "If you struggle with this...",
        "This actually works!",
        "Here's what makes it amazing:",
        "You need this in your life! 👆",
      ],
      format: 'problem-solution',
    },
    'gift-idea': {
      primaryHook: "Best gift EVER? 🎁",
      benefits: [
        "Everyone will love this",
        "Unique and thoughtful",
        "Arrives ready to gift",
      ],
      captions: [
        "Gift idea alert! 🎁",
        "They're going to LOVE this",
        "Why it's the perfect gift:",
        "Get it for someone special! 👆",
      ],
      format: 'gift-idea',
    },
    'day-in-life': {
      primaryHook: "POV: Your new daily essential ☀️",
      benefits: [
        "Use it every single day",
        "Makes life so much easier",
        "Can't imagine life without it",
      ],
      captions: [
        "A day in the life with this...",
        "It's become essential for me",
        "Here's how I use it:",
        "Add it to your routine! 👆",
      ],
      format: 'day-in-life',
    },
  };

  return templates[options.format] || templates['deal-discovery'];
}

/**
 * Generate multiple hook variations for A/B testing
 */
export async function generateHookVariations(
  options: HookGenerationOptions,
  count: number = 3
): Promise<GeneratedHooks[]> {
  const variations: GeneratedHooks[] = [];

  for (let i = 0; i < count; i++) {
    const hooks = await generateVideoHooks(options);
    variations.push(hooks);

    // Small delay to avoid rate limiting
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return variations;
}
