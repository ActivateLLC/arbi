/**
 * Virality scorer — "generate several, deploy only the best."
 *
 * Rendering N full videos is expensive (Higgsfield credits), so we score the
 * cheap creative layer FIRST: generate several hook/script variations, score
 * each for short-form virality with the LLM (Gemini → Anthropic), and only
 * render + advertise the winner. Deterministic rubric, JSON output, and a safe
 * fallback (variation 0) so this never blocks the pipeline.
 */

import { generateText, hasTextProvider } from './textProvider';

export interface ScorableVariation {
  hook: string;
  benefits?: string[];
  captions?: string[];
}

export interface VarScore {
  index: number;
  score: number; // 0..100
  reason: string;
}

export interface ViralityResult {
  bestIndex: number;
  scores: VarScore[];
  source: 'ai' | 'fallback';
}

const clampScore = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Score variations 0..100 for predicted short-form virality and return the
 * winner. Falls back to the first variation if AI is unavailable or returns junk.
 */
export async function scoreVariations(variations: ScorableVariation[]): Promise<ViralityResult> {
  const fallback: ViralityResult = {
    bestIndex: 0,
    scores: variations.map((_, i) => ({ index: i, score: i === 0 ? 60 : 50, reason: 'fallback (no scorer)' })),
    source: 'fallback',
  };
  if (variations.length <= 1 || !hasTextProvider()) return { ...fallback, bestIndex: 0 };

  const system = `You are a short-form (TikTok/Reels/YouTube Shorts) performance-ad analyst. Score each ad
variation 0-100 for predicted VIRALITY + conversion, judging: hook strength in the first 1-2s, pattern
interrupt, curiosity/emotion, clarity of benefit, and CTA pull. Be discerning — spread the scores, don't
cluster. Return ONLY JSON: {"scores":[{"index":<n>,"score":<0-100>,"reason":"<=12 words"}]}.`;

  const user = `Score these ${variations.length} variations:\n` +
    variations.map((v, i) => `#${i}: HOOK="${v.hook}" | BENEFITS=${(v.benefits || []).join('; ')} | CAPTIONS=${(v.captions || []).join(' / ')}`).join('\n');

  try {
    const raw = await generateText({ system, user, temperature: 0.3, maxTokens: 500 });
    const m = raw?.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    const arr = Array.isArray(parsed?.scores) ? parsed.scores : [];
    if (!arr.length) return fallback;
    const scores: VarScore[] = variations.map((_, i) => {
      const found = arr.find((s: any) => Number(s.index) === i);
      return { index: i, score: found ? clampScore(found.score) : 0, reason: String(found?.reason || '').slice(0, 80) };
    });
    const bestIndex = scores.reduce((best, s) => (s.score > scores[best].score ? s.index : best), 0);
    return { bestIndex, scores, source: 'ai' };
  } catch {
    return fallback;
  }
}
