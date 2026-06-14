/**
 * Ad Creative Engine — the "brain" that turns a product into a high-converting,
 * UGC-style creative brief: scroll-stopping hooks, a 5-part short-form video
 * script, burned-in caption overlays, and paid-social copy.
 *
 * Grounded in 2025–2026 direct-response research, not guesswork:
 *  - Short-form VERTICAL (9:16) video is ~78% of top-performing ecommerce ads
 *    and converts far better than static (2.8% vs 1.1% CTR); UGC-style video
 *    converts 6.7–10.4× better than non-UGC and is trusted more than brand video.
 *  - The HOOK must land in the first 1.7–3s (90% of retention is decided there).
 *  - Proven structure: hook → problem → solution → proof → CTA, 15–30s.
 *  - CAPTIONS are mandatory (85% watch muted).
 *  - Multi-format (video + image) beats video-only by ~20% (Google Demand Gen).
 *
 * This module is deterministic and dependency-free so it always produces a
 * usable brief; the actual VIDEO render (Higgsfield/Reap) and image generation
 * consume this brief downstream.
 */

import { ProductAdData, shortProductName } from './campaignAutomation';

export interface ScriptBeat {
  part: 'hook' | 'problem' | 'solution' | 'proof' | 'cta';
  /** Spoken / voiceover line. */
  vo: string;
  /** Burned-in on-screen caption (kept short for readability). */
  onScreen: string;
  /** Approx seconds for this beat. */
  seconds: number;
}

export interface CreativeBrief {
  productId: string;
  shortName: string;
  category?: string;
  format: { aspectRatio: '9:16'; targetSeconds: number; captions: true; soundOnOptional: boolean };
  /** Scroll-stoppers for the first 1–3s. Test several; keep the winner. */
  hooks: string[];
  /** 5-beat UGC script (hook → problem → solution → proof → CTA). */
  script: ScriptBeat[];
  /** Punchy burned-in caption overlay lines (the muted-viewer storyline). */
  captionLines: string[];
  /** Paid-social primary text variants. */
  primaryTexts: string[];
  /** Calls to action. */
  ctas: string[];
}

const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n).trim() : s);

const meaningfulCategory = (c?: string) => {
  const t = (c || '').trim();
  return t && !/^(general|cj|cjdropshipping|uncategorized)$/i.test(t) ? t : '';
};

/** Dedupe case-insensitively, drop blanks, cap length, preserve order. */
function uniq(lines: string[], maxLen: number, limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const t = cap((l || '').replace(/\s+/g, ' ').trim(), maxLen);
    const key = t.toLowerCase();
    if (t && !seen.has(key)) { seen.add(key); out.push(t); }
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Build proven-formula UGC hooks. Personalized with the product's short name
 * and category. Kept <=60 chars so they read as a 1–2s overlay.
 */
export function buildHooks(product: ProductAdData): string[] {
  const s = shortProductName(product.productName);
  const cat = meaningfulCategory(product.category) || 'this';
  return uniq([
    `POV: you finally found the perfect ${s}`,
    `Stop scrolling if you've wanted ${s}`,
    `I was today years old when I found ${s}`,
    `3 reasons ${s} is going viral`,
    `Don't buy ${cat} until you see this`,
    `The ${s} everyone is obsessed with`,
    `Watch before you buy ${s}`,
    `This ${cat} sold out twice — here's why`,
    `Honestly? ${s} is worth the hype`,
    `Run, don't walk — ${s} is back in stock`,
  ], 60, 8);
}

/**
 * Build the 5-beat UGC video script (~22s total). Each beat carries a VO line
 * and a short on-screen caption; designed vertical, captioned, sound-optional.
 */
export function buildScript(product: ProductAdData): ScriptBeat[] {
  const s = shortProductName(product.productName);
  const cat = meaningfulCategory(product.category) || 'product';
  return [
    {
      part: 'hook',
      vo: `Okay, you NEED to see this ${s}.`,
      onScreen: cap(`POV: you found the ${s} 👀`, 50),
      seconds: 3,
    },
    {
      part: 'problem',
      vo: `I was so tired of cheap ${cat} that never lived up to the hype.`,
      onScreen: cap(`tired of ${cat} that disappoints?`, 50),
      seconds: 5,
    },
    {
      part: 'solution',
      vo: `Then I tried this ${s} — and honestly it changed everything.`,
      onScreen: cap(`this ${s} actually delivers ✅`, 50),
      seconds: 6,
    },
    {
      part: 'proof',
      vo: `Thousands of 5-star reviews, fast shipping, and easy returns.`,
      onScreen: cap(`⭐⭐⭐⭐⭐ loved by thousands`, 50),
      seconds: 5,
    },
    {
      part: 'cta',
      vo: `Tap to grab yours before it sells out again.`,
      onScreen: cap(`tap to shop — free shipping 🛒`, 50),
      seconds: 4,
    },
  ];
}

export function buildPrimaryTexts(product: ProductAdData): string[] {
  const s = shortProductName(product.productName);
  return uniq([
    `The ${s} everyone's talking about — free shipping, easy 30-day returns. Tap to shop. 🛒`,
    `Why settle? This ${s} is loved by thousands. Limited stock — get yours today.`,
    `Real reviews, fast shipping, no risk. See why ${s} keeps selling out. ⭐`,
  ], 280, 3);
}

/**
 * Assemble the full creative brief for a product.
 */
export function buildCreativeBrief(product: ProductAdData): CreativeBrief {
  const script = buildScript(product);
  return {
    productId: product.productId,
    shortName: shortProductName(product.productName),
    category: meaningfulCategory(product.category) || undefined,
    format: { aspectRatio: '9:16', targetSeconds: script.reduce((t, b) => t + b.seconds, 0), captions: true, soundOnOptional: true },
    hooks: buildHooks(product),
    script,
    captionLines: script.map((b) => b.onScreen),
    primaryTexts: buildPrimaryTexts(product),
    ctas: ['Shop Now', 'Get Yours', 'Buy Today', 'Shop the Sale'],
  };
}
