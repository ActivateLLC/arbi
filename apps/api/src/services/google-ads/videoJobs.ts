/**
 * Video-job lifecycle tracker — the single source of truth for "where is this
 * product's UGC ad in the pipeline" so the Command Center can show a native,
 * sequential status (queued → rendering → uploading → launching → live) WITHOUT
 * the operator ever tapping YouTube/TikTok.
 *
 * In-memory by design: the engine runs as a single Railway process, and these
 * are ephemeral progress beats (the durable result — the YouTube URL and the
 * live campaign — is persisted on the listing / in Google Ads). On restart a
 * job simply re-derives from the catalog (a listing with a videoUrl is "ready").
 */

export type VideoStage =
  | 'queued'      // picked by the engine / requested, not started yet
  | 'scripting'   // choosing the hook + format + pulling social proof
  | 'rendering'   // Higgsfield is generating the video
  | 'uploading'   // hosting on YouTube
  | 'launching'   // creating / enabling the Google Ads video campaign
  | 'live'        // campaign ENABLED (serving)
  | 'ready'       // rendered + hosted + PAUSED campaign created (awaiting go-live)
  | 'failed';

export interface VideoJob {
  listingId: string;
  productTitle: string;
  stage: VideoStage;
  startedAt: number;
  updatedAt: number;
  videoUrl?: string;       // YouTube watch URL once hosted
  format?: string;         // ad format (try-on / unboxing / demo / review / ugc)
  campaignId?: string;
  error?: string;
}

const STAGE_ORDER: VideoStage[] = ['queued', 'scripting', 'rendering', 'uploading', 'launching', 'ready', 'live'];

// Keep terminal jobs around briefly so the UI can show "live"/"failed" before
// they fall off; cap the map so a long-running process can't grow unbounded.
const TERMINAL_TTL_MS = 30 * 60_000;
const MAX_JOBS = 200;

const jobs = new Map<string, VideoJob>();

function prune(): void {
  const now = Date.now();
  for (const [id, j] of jobs) {
    if ((j.stage === 'live' || j.stage === 'failed' || j.stage === 'ready') && now - j.updatedAt > TERMINAL_TTL_MS) {
      jobs.delete(id);
    }
  }
  if (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.values()].sort((a, b) => a.updatedAt - b.updatedAt).slice(0, jobs.size - MAX_JOBS);
    for (const j of oldest) jobs.delete(j.listingId);
  }
}

/** Begin (or restart) tracking a product's video job. */
export function startJob(listingId: string, productTitle: string): void {
  if (!listingId) return;
  const now = Date.now();
  jobs.set(listingId, { listingId, productTitle: productTitle || listingId, stage: 'queued', startedAt: now, updatedAt: now });
  prune();
}

/** Advance/patch a job. No-op if the job was never started (defensive). */
export function updateJob(listingId: string, patch: Partial<Omit<VideoJob, 'listingId' | 'startedAt'>>): void {
  if (!listingId) return;
  const existing = jobs.get(listingId);
  const now = Date.now();
  const base: VideoJob = existing || { listingId, productTitle: listingId, stage: 'queued', startedAt: now, updatedAt: now };
  jobs.set(listingId, { ...base, ...patch, updatedAt: now });
  prune();
}

export function failJob(listingId: string, error: string): void {
  updateJob(listingId, { stage: 'failed', error });
}

export function getJob(listingId: string): VideoJob | undefined {
  return jobs.get(listingId);
}

/** All known jobs, newest activity first — powers the dashboard lifecycle list. */
export function listJobs(): VideoJob[] {
  prune();
  return [...jobs.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** A 0-100 progress hint from the stage, for a determinate-feel progress bar. */
export function stageProgress(stage: VideoStage): number {
  if (stage === 'failed') return 100;
  const i = STAGE_ORDER.indexOf(stage);
  if (i < 0) return 0;
  return Math.round((i / (STAGE_ORDER.length - 1)) * 100);
}
