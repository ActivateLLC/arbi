/**
 * AI-generated Responsive Search Ad copy ("10/10 ads").
 *
 * Templated headlines/descriptions get ads serving, but they're generic. This
 * uses the LLM (Gemini → Anthropic failover) to write product-specific, high-
 * intent RSA copy: distinct headlines (<=30 chars) and descriptions (<=90),
 * which lifts Google Ad Strength and Quality Score (cheaper clicks, more reach).
 *
 * SAFETY: the model's output is never trusted blindly. Everything is length-
 * clamped, deduped, and merged with the proven template assets so we ALWAYS
 * return a full, Google-compliant set (>=3 headlines, >=2 descriptions) even if
 * the model is unavailable or returns junk. On total failure we return the
 * templates unchanged — ad creation never breaks because of the AI layer.
 */

import { generateText, hasTextProvider } from '../../services/ai/textProvider';
import {
  ProductAdData,
  buildHeadlines,
  buildDescriptions,
  shortProductName,
} from './campaignAutomation';

const HEADLINE_MAX = 30;
const DESC_MAX = 90;

/** Clamp, trim, dedupe case-insensitively, drop blanks; preserve order. */
function clean(lines: string[], maxLen: number, limit: number): { text: string }[] {
  const seen = new Set<string>();
  const out: { text: string }[] = [];
  for (const l of lines) {
    const text = String(l || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      out.push({ text });
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** Pull a JSON object out of a model response that may wrap it in prose/fences. */
function extractJson(s: string): any | null {
  if (!s) return null;
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export interface AdCopy {
  headlines: { text: string }[];
  descriptions: { text: string }[];
  source: 'ai' | 'template';
}

/**
 * Generate RSA copy for a product. Always returns a valid, compliant set.
 * `customerCount`/category give the model real context; output is validated and
 * back-filled from templates so we never ship fewer than Google requires.
 */
export async function generateAdCopy(product: ProductAdData): Promise<AdCopy> {
  // Proven baseline — also the fallback and the back-fill source.
  const templateHeadlines = buildHeadlines(product);
  const templateDescriptions = buildDescriptions(product);

  if (!hasTextProvider()) {
    return { headlines: templateHeadlines, descriptions: templateDescriptions, source: 'template' };
  }

  const short = shortProductName(product.productName);
  const system = `You are a senior Google Ads copywriter. Write Responsive Search Ad copy that maximizes
click-through and Ad Strength for an ecommerce product. Follow Google policy: no ALL-CAPS words,
no excessive punctuation, no unverified superlatives ("#1", "best ever"), no prices unless given.
Headlines MUST be <= 30 characters. Descriptions MUST be <= 90 characters. Every headline and
every description must be DISTINCT. Be specific, benefit-led, and high-intent.
Return ONLY JSON: {"headlines": string[12], "descriptions": string[4]}.`;

  const user = `Product: ${product.productName}
Short name: ${short}
Category: ${product.category || 'general'}
Price: $${product.productPrice || 'n/a'}
Write 12 distinct headlines (<=30 chars) mixing the product name, benefits, offers (free shipping,
fast delivery, 30-day returns, secure checkout), and strong CTAs. Then 4 distinct descriptions
(<=90 chars) that sell the benefit and end with a clear CTA. JSON only.`;

  try {
    const raw = await generateText({ system, user, temperature: 0.7, maxTokens: 700 });
    const parsed = raw ? extractJson(raw) : null;
    const aiHeadlines: string[] = Array.isArray(parsed?.headlines) ? parsed.headlines : [];
    const aiDescriptions: string[] = Array.isArray(parsed?.descriptions) ? parsed.descriptions : [];

    // Merge AI first, then back-fill with templates so we hit Google's minimums
    // (>=3 headlines, >=2 descriptions) even if the model under-delivered.
    const headlines = clean(
      [...aiHeadlines, ...templateHeadlines.map((h) => h.text)],
      HEADLINE_MAX,
      15
    );
    const descriptions = clean(
      [...aiDescriptions, ...templateDescriptions.map((d) => d.text)],
      DESC_MAX,
      4
    );

    const usedAi = aiHeadlines.length > 0 || aiDescriptions.length > 0;
    if (headlines.length >= 3 && descriptions.length >= 2) {
      return { headlines, descriptions, source: usedAi ? 'ai' : 'template' };
    }
  } catch (e: any) {
    console.error('AI ad copy generation failed, using templates:', e?.message || e);
  }

  return { headlines: templateHeadlines, descriptions: templateDescriptions, source: 'template' };
}
