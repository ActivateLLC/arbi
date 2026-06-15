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
