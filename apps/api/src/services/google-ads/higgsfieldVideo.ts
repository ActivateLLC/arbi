/**
 * Higgsfield video generation — turns a product image + creative brief into a
 * UGC-style 9:16 ad video via Higgsfield's image-to-video (DoP) model.
 *
 * Research-backed: short-form vertical UGC video is the highest-converting
 * creative for ecommerce. We animate the REAL product photo (honest, on-brand)
 * with a hook-driven motion prompt derived from the creative brief.
 *
 * Auth: the documented Higgsfield REST API (see higgsfieldRest.ts). Credentials
 * come from HF_API_KEY + HF_API_SECRET (or a combined HF_CREDENTIALS="id:secret").
 */

import { ProductAdData } from './campaignAutomation';
import { buildCreativeBrief, CreativeBrief } from './adCreative';
import { submitAndWait, videoModelId, isConcurrencyLimitError } from './higgsfieldRest';
import { describeImage } from '../ai/textProvider';

function credentials(): string {
  const combined = (process.env.HF_CREDENTIALS || '').trim();
  if (combined) return combined;
  const id = (process.env.HF_API_KEY || '').trim();
  const secret = (process.env.HF_API_SECRET || '').trim();
  return id && secret ? `${id}:${secret}` : '';
}

export function isConfigured(): boolean {
  return !!credentials();
}

/**
 * Choose the ad FORMAT/style from the product type — research shows format
 * should match the product (apparel→try-on, gadget→unboxing, tools/home→demo,
 * jewelry/beauty→review/close-up; UGC otherwise). Maps cleanly to Higgsfield
 * Marketing Studio presets when that endpoint is wired (UGC Virtual Try-On /
 * Unboxing / Tutorial / Product Review / UGC).
 */
export type AdFormat = 'try-on' | 'unboxing' | 'demo' | 'review' | 'ugc';
export function pickAdFormat(productName: string, category?: string): AdFormat {
  const t = `${productName} ${category || ''}`.toLowerCase();
  if (/(shirt|dress|pant|panties|shaping|legging|bra|shoe|jacket|sock|hoodie|wear|apparel|clothing|swim|lingerie|skirt|coat)/.test(t)) return 'try-on';
  if (/(necklace|ring|bracelet|pendant|jewel|earring|watch|skincare|serum|cream|beauty|makeup|cosmetic)/.test(t)) return 'review';
  if (/(camera|charger|headphone|earbud|speaker|gadget|electronic|device|light|tech|drone|monitor|keyboard|cable|power)/.test(t)) return 'unboxing';
  if (/(kitchen|cleaner|brush|tool|organizer|home|pad|frame|holder|mount|gadget|appliance|cook|bottle)/.test(t)) return 'demo';
  return 'ugc';
}

/**
 * Per-format MOTION direction. Image-to-video lives or dies on the camera/subject
 * MOTION it's told to perform — a "vibe" prompt yields a near-static clip. Each
 * line is a single, coherent, continuous-shot motion arc (these models render ONE
 * shot, not multi-cut edits) tuned to what converts for that product type.
 */
const FORMAT_DIRECTION: Record<AdFormat, string> = {
  'try-on': 'A real model wears the product; smooth camera tilt up the body and a confident slow turn, fabric and hair moving naturally, lifestyle setting with soft window light.',
  'unboxing': 'Hands lift and reveal the product toward camera; slow cinematic push-in (dolly) onto the product as it catches the light, shallow depth of field, premium soft studio lighting, satisfying reveal motion.',
  'demo': 'The product is actively used and clearly working — its moving parts in motion, hands operating it — while the camera slowly orbits to show it solving the problem, crisp and well-lit.',
  'review': 'Macro beauty shot: the product slowly rotates on display as light sweeps across its surface creating sparkle and highlights, shallow depth of field, elegant bokeh, gentle parallax.',
  'ugc': 'Handheld selfie-style energy: a relatable creator holds the product up to camera with a slow push-in, subtle natural handheld movement, bright authentic indoor lighting, product front-and-center.',
};

/**
 * Compose a MASTER-LEVEL image-to-video prompt from the creative brief, tuned to
 * the product's ad FORMAT and the conversion research: hero the real product,
 * direct one continuous cinematic motion (camera + subject), premium-but-authentic
 * look, vertical 9:16. We explicitly hero the product and forbid garbled text /
 * warping (the two things that make AI product video look cheap). Sound-off
 * friendly; captions/CTA are layered downstream.
 */
export function buildMotionPrompt(brief: CreativeBrief, format: AdFormat = 'ugc', visual?: string): string {
  const hook = brief.hooks[0] || `Check out the ${brief.shortName}`;
  return [
    `Vertical 9:16 cinematic short-form product ad for the ${brief.shortName}.`,
    // Vision-derived description of the ACTUAL product in the source image, so the
    // motion direction matches what's really there (color/material/type), not just
    // the title. Empty when no vision provider is available.
    visual ? `The product in frame: ${visual}` : '',
    `Hero the product exactly as shown in the source image — keep it sharp, centered, and recognizable the entire time.`,
    FORMAT_DIRECTION[format],
    `Energy/hook to convey in the opening beat: "${hook}".`,
    `Scroll-stopping first frame, dynamic continuous motion, vibrant punchy color, soft realistic lighting, high detail, 4k, professional commercial quality, smooth natural movement.`,
    `Avoid: on-screen text, captions, logos, watermarks, distortion, warping, morphing, extra fingers, melting product.`,
  ].filter(Boolean).join(' ');
}

export interface GeneratedVideo {
  videoUrl: string;
  status: string;
  prompt: string;
  format: AdFormat;
  brief: CreativeBrief;
}

/**
 * Generate a UGC product video from a product image. `withPolling` blocks until
 * Higgsfield finishes (DoP turbo is the fastest model).
 */
export async function generateProductVideo(
  product: ProductAdData,
  imageUrl: string,
  opts?: { model?: 'dop-lite' | 'dop-turbo' | 'dop-standard'; reviewQuote?: string }
): Promise<GeneratedVideo> {
  if (!imageUrl) throw new Error('A product image URL is required to generate a video.');
  // Use a REAL customer review as the social-proof beat when available.
  const brief = buildCreativeBrief(product, opts?.reviewQuote);
  // Pick the ad format from the product type so the creative matches the product
  // (try-on for apparel, unboxing for gadgets, demo for tools, review for jewelry).
  const format = pickAdFormat(product.productName, product.category);
  // SEE the image first: a vision model describes the actual product so the motion
  // prompt is tailored to what's really in the photo (you can't prompt well for an
  // image you can't see). Non-fatal — falls back to the title-based prompt.
  let visual: string | undefined;
  try {
    visual = (await describeImage(
      imageUrl,
      'Describe ONLY the product in this image for an ad video prompt: its type, color, material/finish, and 2-3 standout visual features. One or two sentences, concrete and visual. If the image is a collage or has multiple products, describe the single most prominent product.'
    )) || undefined;
  } catch { /* non-fatal: title-based prompt */ }
  const prompt = buildMotionPrompt(brief, format, visual);

  // Request a LONGER, higher-quality render. These models default to their bare
  // minimum (~3s) when no duration is given — the catalog supports up to ~10-15s.
  // We don't know each REST model's exact optional-param names, so we try a rich
  // arg-set first and FALL BACK to leaner sets if the API rejects a field (a 4xx
  // on submit costs no credits — the render never starts). The base contract
  // {image_url, prompt} is known-good and always the last resort.
  const modelId = videoModelId();
  const duration = Math.min(Math.max(Number(process.env.HF_VIDEO_DURATION) || 10, 3), 15);
  const base: Record<string, any> = { image_url: imageUrl, prompt };
  const argSets: Record<string, any>[] = [
    { ...base, duration, aspect_ratio: '9:16', enhance_prompt: true },
    { ...base, duration, enhance_prompt: true },
    { ...base, duration },
    base,
  ];

  let lastErr: any;
  for (const args of argSets) {
    try {
      const rest = await submitAndWait(modelId, args);
      if (!rest.videoUrl) throw new Error(`Higgsfield returned no video (status=${rest.status}).`);
      return { videoUrl: rest.videoUrl, status: rest.status, prompt, format, brief };
    } catch (e: any) {
      lastErr = e;
      // Only fall back on a 4xx param rejection (no credits spent). Anything else
      // (network, timeout, render failure) is real — stop and surface it.
      const status = e?.response?.status;
      const isParamReject = (status === 400 || status === 422) && !isConcurrencyLimitError(e);
      if (!isParamReject) throw e;
      // else: try the next, leaner arg-set.
    }
  }
  throw lastErr || new Error('Higgsfield render failed.');
}
