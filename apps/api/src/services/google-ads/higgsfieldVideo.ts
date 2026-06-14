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
 * Compose a motion/scene prompt for the DoP image-to-video model from the
 * creative brief — UGC aesthetic, hook-forward, vertical, dynamic.
 */
export function buildMotionPrompt(brief: CreativeBrief): string {
  const hook = brief.hooks[0] || `Check out the ${brief.shortName}`;
  return [
    `UGC-style vertical (9:16) product ad for the ${brief.shortName}.`,
    `Opening hook vibe: "${hook}".`,
    `Authentic handheld feel, smooth cinematic push-in on the product,`,
    `soft natural lighting, vibrant and scroll-stopping, energetic social-media commercial.`,
  ].join(' ');
}

export interface GeneratedVideo {
  videoUrl: string;
  status: string;
  prompt: string;
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
  const prompt = buildMotionPrompt(brief);

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
  return { videoUrl, status: resp.status, prompt, brief };
}
