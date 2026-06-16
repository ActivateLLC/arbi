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
 * native DoP Standard (cinematic camera motion, matches our motion prompt).
 * Override via HF_VIDEO_MODEL_ID to switch models, e.g.:
 *   higgsfield-ai/dop/standard            (default, Higgsfield DoP)
 *   kling-video/v2.1/pro/image-to-video   (Kling 2.1 Pro)
 *   bytedance/seedance/v1/pro/image-to-video (Seedance 1.0 Pro — product/identity)
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
export async function submitAndWait(
  modelId: string,
  args: Record<string, any>,
  opts: { webhookUrl?: string; timeoutMs?: number; intervalMs?: number } = {}
): Promise<RestResult> {
  const auth = authHeader();
  if (!auth) throw new Error('Higgsfield not configured (HF_API_KEY/HF_API_SECRET).');
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const intervalMs = opts.intervalMs ?? 4_000;

  const url = `${BASE}/${modelId}${opts.webhookUrl ? `?hf_webhook=${encodeURIComponent(opts.webhookUrl)}` : ''}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' };

  const pick = (d: any): RestResult => ({
    status: d?.status,
    videoUrl: d?.video?.url,
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
