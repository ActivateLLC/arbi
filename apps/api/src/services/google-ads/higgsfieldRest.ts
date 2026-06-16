/**
 * Higgsfield REST client — the DOCUMENTED, official integration path.
 *
 * Higgsfield's JS/TS SDK is "coming soon"; the docs say to use the REST API
 * directly. This implements that contract faithfully:
 *   POST https://platform.higgsfield.ai/{model_id}
 *     Authorization: Key {key}:{secret}
 *     body = arguments JSON     (+ optional ?hf_webhook=<url>)
 *   → { status, request_id, status_url, cancel_url }
 *   then poll status_url (GET) until completed | failed | nsfw.
 *
 * We use this when HF_VIDEO_MODEL_ID is set (the documented model_id, e.g.
 * "higgsfield-ai/dop/turbo"); otherwise the caller falls back to the existing
 * (working) npm-client path, so enabling this never breaks a live feature.
 */

import axios from 'axios';

const BASE = 'https://platform.higgsfield.ai';

function authHeader(): string {
  const combined = (process.env.HF_CREDENTIALS || process.env.HF_KEY || '').trim();
  if (combined) return `Key ${combined}`;
  const id = (process.env.HF_API_KEY || '').trim();
  const secret = (process.env.HF_API_SECRET || '').trim();
  return id && secret ? `Key ${id}:${secret}` : '';
}

/**
 * The documented model_id for product image-to-video. Defaults to Higgsfield's
 * native DoP Standard — confirmed VALID for this account (Seedance 404s / isn't
 * on the plan). Override via HF_VIDEO_MODEL_ID, e.g.:
 *   higgsfield-ai/dop/standard            (default — valid, cinematic motion)
 *   kling-video/v2.1/pro/image-to-video   (Kling 2.1 — also valid; motion realism)
 */
export function videoModelId(): string {
  return (process.env.HF_VIDEO_MODEL_ID || 'higgsfield-ai/dop/standard').trim();
}

export interface RestResult {
  status: string;
  videoUrl?: string;
  imageUrl?: string;
  requestId?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Submit a generation to the documented REST API and wait for the result.
 * Polls status_url every `intervalMs` up to `timeoutMs` (video can take minutes).
 */
/**
 * Submit-only (no polling) — for fast diagnostics. Returns the immediate API
 * response (queued + request_id) or throws with the exact upstream error, so we
 * can tell in seconds whether auth/model/credits are the problem vs. the render.
 */
export async function submitOnly(modelId: string, args: Record<string, any>): Promise<any> {
  const auth = authHeader();
  if (!auth) throw new Error('Higgsfield not configured (HF_API_KEY/HF_API_SECRET).');
  try {
    const r = await axios.post(`${BASE}/${modelId}`, args, {
      headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 25_000,
    });
    return { ok: true, modelId, status: r.data?.status, request_id: r.data?.request_id, data: r.data };
  } catch (e: any) {
    return { ok: false, modelId, httpStatus: e?.response?.status, error: e?.response?.data || e?.message || String(e) };
  }
}

export async function submitAndWait(
  modelId: string,
  args: Record<string, any>,
  opts: { webhookUrl?: string; timeoutMs?: number; intervalMs?: number } = {}
): Promise<RestResult> {
  const auth = authHeader();
  if (!auth) throw new Error('Higgsfield not configured (HF_API_KEY/HF_API_SECRET).');
  const timeoutMs = opts.timeoutMs ?? Math.max(Number(process.env.HF_RENDER_TIMEOUT_MS) || 8 * 60_000, 60_000);
  const intervalMs = opts.intervalMs ?? 4_000;

  const url = `${BASE}/${modelId}${opts.webhookUrl ? `?hf_webhook=${encodeURIComponent(opts.webhookUrl)}` : ''}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' };

  // Robustly extract a video URL — Higgsfield's completed payload shape varies by
  // model/version (video.url, results[].url, output.video_url, raw .mp4 string…).
  // Missing the field would silently throw "no video" even on a SUCCESSFUL render,
  // so we probe every common location and any nested *.mp4 URL as a last resort.
  const findVideoUrl = (d: any): string | undefined => {
    if (!d) return undefined;
    const direct =
      d.video?.url || d.video_url || (typeof d.video === 'string' ? d.video : undefined) ||
      d.output?.video?.url || d.output?.url || d.output?.video_url ||
      d.result?.video?.url || d.result?.url ||
      (Array.isArray(d.results) ? (d.results[0]?.video?.url || d.results[0]?.url) : undefined) ||
      (Array.isArray(d.videos) ? (d.videos[0]?.url || (typeof d.videos[0] === 'string' ? d.videos[0] : undefined)) : undefined) ||
      (Array.isArray(d.assets) ? d.assets.find((a: any) => /\.mp4/i.test(a?.url || a?.type || ''))?.url : undefined) ||
      (Array.isArray(d.outputs) ? (d.outputs[0]?.url || d.outputs[0]?.video?.url) : undefined);
    if (direct) return direct;
    // Last resort: deep-scan for the first http(s) .mp4/.mov/.webm URL anywhere.
    try {
      const m = JSON.stringify(d).match(/https?:\/\/[^"'\\\s]+\.(?:mp4|mov|webm)[^"'\\\s]*/i);
      return m ? m[0] : undefined;
    } catch { return undefined; }
  };
  const pick = (d: any): RestResult => ({
    status: d?.status,
    videoUrl: findVideoUrl(d),
    imageUrl: Array.isArray(d?.images) ? d.images[0]?.url : undefined,
    requestId: d?.request_id,
  });

  const submit = await axios.post(url, args, { headers, timeout: 30_000 });
  let data = submit.data || {};
  // Some requests may already be complete on submit; otherwise poll status_url.
  if (data.status === 'completed') return pick(data);
  const statusUrl: string = data.status_url || `${BASE}/requests/${data.request_id}/status`;
  if (!data.request_id && data.status !== 'queued' && data.status !== 'in_progress') {
    // Unexpected synchronous shape — return whatever we got.
    return pick(data);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    const r = await axios.get(statusUrl, { headers, timeout: 20_000 });
    data = r.data || {};
    if (['completed', 'failed', 'nsfw', 'cancelled'].includes(data.status)) break;
  }
  if (data.status !== 'completed') {
    throw new Error(`Higgsfield REST status="${data.status || 'timeout'}"${data.error ? `: ${data.error}` : ''}`);
  }
  return pick(data);
}
