/**
 * Higgsfield video generation — turns a product image + creative brief into a
 * UGC-style 9:16 ad video via Higgsfield's image-to-video (DoP) model.
 *
 * Research-backed: short-form vertical UGC video is the highest-converting
 * creative for ecommerce. We animate the REAL product photo (honest, on-brand)
 * with a hook-driven motion prompt derived from the creative brief.
 *
 * Auth: the official @higgsfield/client v2 SDK. Credentials come from
 * HF_API_KEY + HF_API_SECRET (or a combined HF_CREDENTIALS="id:secret").
 * The SDK is required lazily so a missing key/dep never crashes boot.
 */

import { ProductAdData } from './campaignAutomation';
import { buildCreativeBrief, CreativeBrief } from './adCreative';

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

let _client: any = null;
function getClient(): any {
  const creds = credentials();
  if (!creds) {
    throw new Error('Higgsfield not configured: set HF_API_KEY and HF_API_SECRET in the environment.');
  }
  if (!_client) {
    // Lazy require keeps the SDK out of the boot path and out of the bundle
    // (it is marked external in the build).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createHiggsfieldClient } = require('@higgsfield/client/v2');
    _client = createHiggsfieldClient({ credentials: creds });
  }
  return _client;
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

const FORMAT_DIRECTION: Record<AdFormat, string> = {
  'try-on': 'UGC try-on: a real person wearing/using the product, flattering angles, lifestyle setting.',
  'unboxing': 'UGC unboxing: hands opening/revealing the product, satisfying reveal, close detail shots.',
  'demo': 'UGC demo: the product in real use solving a problem, clear before/after, hands-on.',
  'review': 'UGC review: warm close-up beauty shots, sparkle/detail, an authentic recommendation feel.',
  'ugc': 'UGC selfie-style: a relatable creator hyping the product to camera, handheld, authentic.',
};

/**
 * Compose a motion/scene prompt from the creative brief, tuned to the product's
 * ad FORMAT and the research on what converts: front-load the hook (decide the
 * first 1-2s), authentic UGC look (out-converts polished 3-5x), vertical 9:16,
 * 15-20s pacing, sound-off friendly. Captions/CTA are added downstream.
 */
export function buildMotionPrompt(brief: CreativeBrief, format: AdFormat = 'ugc'): string {
  const hook = brief.hooks[0] || `Check out the ${brief.shortName}`;
  return [
    `Vertical 9:16 short-form UGC product ad for the ${brief.shortName}, ~15-20s, scroll-stopping.`,
    FORMAT_DIRECTION[format],
    `OPEN on a strong pattern-interrupt in the first 1-2 seconds — hook vibe: "${hook}".`,
    `Authentic handheld feel, soft natural lighting, energetic native social-media look (not polished/corporate).`,
    `Reads clearly with sound off; vibrant, fast, benefit-forward.`,
  ].join(' ');
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
  opts?: { model?: 'dop-lite' | 'dop-turbo' | 'dop-standard' }
): Promise<GeneratedVideo> {
  if (!imageUrl) throw new Error('A product image URL is required to generate a video.');
  const brief = buildCreativeBrief(product);
  // Pick the ad format from the product type so the creative matches the product
  // (try-on for apparel, unboxing for gadgets, demo for tools, review for jewelry).
  const format = pickAdFormat(product.productName, product.category);
  const prompt = buildMotionPrompt(brief, format);

  const client = getClient();
  const resp = await client.subscribe('/v1/image2video/dop', {
    input: {
      model: opts?.model || 'dop-turbo',
      prompt,
      input_images: [{ type: 'image_url', image_url: imageUrl }],
      enhance_prompt: true,
    },
    withPolling: true,
  });

  // V2Response: { status: 'completed'|'failed'|'nsfw'|..., video?: { url } }
  const videoUrl: string | undefined = resp?.video?.url;
  if (resp?.status !== 'completed' || !videoUrl) {
    throw new Error(`Higgsfield video generation status="${resp?.status}"${videoUrl ? '' : ' (no video url returned)'}`);
  }
  return { videoUrl, status: resp.status, prompt, format, brief };
}
