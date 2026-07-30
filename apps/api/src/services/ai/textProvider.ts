/**
 * Unified text-generation provider with automatic failover.
 *
 * Primary: Google Gemini (gemini-2.5-flash). Backup: Anthropic / Claude. When
 * Gemini has no key, depleted credits, or errors, we transparently fall back to
 * Anthropic (whose key is already set in the deploy env). Either provider being
 * available is enough for AI features to work, so a single depleted account no
 * longer takes "Talk to ARBI" or AI ad-copy offline.
 *
 * Returns the generated text, or null if NEITHER provider could answer — callers
 * decide what to do with null (graceful message, or template fallback).
 */

import axios from 'axios';

export const geminiKey = () =>
  (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.API_KEY || '').trim();

export const anthropicKey = () =>
  (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();

/** True when at least one provider is configured (so callers can short-circuit). */
export function hasTextProvider(): boolean {
  return !!geminiKey() || !!anthropicKey();
}

export interface GenerateTextOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

async function viaGemini(opts: GenerateTextOptions, key: string): Promise<string | null> {
  const { system, user, temperature = 0.4, maxTokens = 600 } = opts;
  const r = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    },
    { timeout: 25000, headers: { 'x-goog-api-key': key } }
  );
  return r.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

async function viaAnthropic(opts: GenerateTextOptions, key: string): Promise<string | null> {
  const { system, user, temperature = 0.4, maxTokens = 600 } = opts;
  const r = await axios.post(
    `https://api.anthropic.com/v1/messages`,
    {
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    },
    {
      timeout: 25000,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );
  const parts = r.data?.content || [];
  return (
    parts
      .filter((p: any) => p?.type === 'text')
      .map((p: any) => p.text)
      .join('')
      .trim() || null
  );
}

/**
 * VISION: describe what's actually in an image. You can't write a good
 * image-to-video prompt for a product you can't see — this fetches the product
 * photo and asks a vision model what it is (type, color, material, key features,
 * and whether it's a clean single-product shot or a busy collage) so the motion
 * prompt can be tailored to the real product. Returns null if no provider/vision
 * is available (caller falls back to the title-based prompt).
 */
export async function describeImage(imageUrl: string, instruction: string): Promise<string | null> {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;
  // Fetch the image bytes once; both providers take inline base64.
  let b64 = '', mime = 'image/jpeg';
  try {
    const img = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 });
    b64 = Buffer.from(img.data).toString('base64');
    mime = (img.headers['content-type'] || '').split(';')[0] || mime;
    if (!/^image\//.test(mime)) mime = 'image/jpeg';
  } catch {
    return null; // can't fetch the image — fall back to title-based prompt
  }

  const gKey = geminiKey();
  if (gKey) {
    try {
      const r = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        { contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: instruction }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 250 } },
        { timeout: 25000, headers: { 'x-goog-api-key': gKey } }
      );
      const t = r.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (t) return t;
    } catch (e: any) {
      console.error('Gemini describeImage failed, trying Anthropic:', e?.response?.data?.error?.message || e?.message || e);
    }
  }

  const aKey = anthropicKey();
  if (aKey) {
    try {
      const r = await axios.post(
        `https://api.anthropic.com/v1/messages`,
        { model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 250, temperature: 0.3,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
            { type: 'text', text: instruction },
          ] }] },
        { timeout: 25000, headers: { 'x-api-key': aKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } }
      );
      const t = (r.data?.content || []).filter((p: any) => p?.type === 'text').map((p: any) => p.text).join('').trim();
      if (t) return t;
    } catch (e: any) {
      console.error('Anthropic describeImage failed:', e?.response?.data?.error?.message || e?.message || e);
    }
  }
  return null;
}

export async function generateText(opts: GenerateTextOptions): Promise<string | null> {
  const gKey = geminiKey();
  if (gKey) {
    try {
      const reply = await viaGemini(opts, gKey);
      if (reply) return reply;
    } catch (e: any) {
      console.error('Gemini generateText failed, trying Anthropic:', e?.response?.data?.error?.message || e?.message || e);
    }
  }

  const aKey = anthropicKey();
  if (aKey) {
    try {
      const reply = await viaAnthropic(opts, aKey);
      if (reply) return reply;
    } catch (e: any) {
      console.error('Anthropic generateText failed:', e?.response?.data?.error?.message || e?.message || e);
    }
  }

  return null;
}
