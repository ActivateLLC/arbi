/**
 * Video-ad pipeline — the full "product → YouTube ad" chain in one place, so the
 * manual route AND the autonomous engine share identical logic:
 *
 *   pick best hook (virality-scored) → pull a real CJ review for social proof →
 *   render the video (Seedance/DoP via Higgsfield) → upload to YouTube (unlisted)
 *   → create a PAUSED Google Ads VIDEO campaign.
 *
 * Long renders (1-3 min) are fine here because the engine calls this from a
 * background cycle (no HTTP request to time out). Campaign creation is non-fatal.
 */

import { listingToProductAd } from './productAdMapper';
import { updateListing } from '../../routes/marketplace';
import { buildHooks } from './adCreative';
import { generateProductVideo, isConfigured as isVideoConfigured } from './higgsfieldVideo';
import { uploadVideoToYouTube } from './youtubeUpload';
import { createVideoCampaign, CampaignConfig, DEFAULT_DAILY_BUDGET } from './campaignAutomation';
import { scoreVariations } from '../ai/viralityScorer';
import { cjClient, isCJConfigured } from '../cjDropshipping';
import { extractReviews } from '../cjSourcing';
import { startJob, updateJob, failJob } from './videoJobs';

export interface VideoAdResult {
  listingId: string;
  sourceVideoUrl?: string;
  youtube?: { videoId: string; watchUrl: string; privacyStatus: string };
  virality?: { bestIndex: number; source: string; scores: any[] };
  videoCampaign?: { status: 'created_paused' | 'failed'; campaignId?: string; error?: string };
}

/** Run the full video-ad pipeline for a listing. Throws only on hard failures
 * (not configured, no image, render/upload failure); campaign creation is soft. */
export async function createVideoAdForListing(listing: any, opts?: { model?: any }): Promise<VideoAdResult> {
  if (!isVideoConfigured()) throw new Error('Higgsfield not configured (HF_API_KEY/HF_API_SECRET).');
  const imageUrl = Array.isArray(listing?.productImages) ? listing.productImages[0] : undefined;
  if (!imageUrl) throw new Error('Listing has no product image to animate.');

  const product = listingToProductAd(listing);
  // Track the lifecycle so the Command Center can show a native, sequential
  // status (queued → scripting → rendering → uploading → launching → ready/live).
  startJob(listing.listingId, listing.productTitle || product.productName);

  try {
    // 1) Best hook (virality-scored).
    updateJob(listing.listingId, { stage: 'scripting' });
    let bestHook: string | undefined;
    let virality: VideoAdResult['virality'];
    try {
      const hooks = buildHooks(product).slice(0, 5);
      const scored = await scoreVariations(hooks.map((h) => ({ hook: h })));
      bestHook = hooks[scored.bestIndex];
      virality = { bestIndex: scored.bestIndex, source: scored.source, scores: scored.scores };
    } catch { /* fall back to default brief hook */ }

    // 2) Real CJ review for the social-proof beat.
    let reviewQuote: string | undefined;
    try {
      if (listing.cjProductId && isCJConfigured()) {
        const reviews = extractReviews(await cjClient.getProductReviews(listing.cjProductId));
        reviewQuote = reviews.filter((r) => r.text && r.text.length > 12).sort((a, b) => b.rating - a.rating)[0]?.text;
      } else if (Array.isArray(listing.reviews) && listing.reviews[0]?.text) {
        reviewQuote = listing.reviews[0].text;
      }
    } catch { /* fall back to generic proof line */ }

    // 3) RENDER the video (the expensive Higgsfield step).
    updateJob(listing.listingId, { stage: 'rendering' });
    const video = await generateProductVideo(product, imageUrl, { model: opts?.model, reviewQuote });

    // PERSIST THE RAW RENDER IMMEDIATELY — this is the bare-minimum success: a
    // reviewable UGC video. We save it BEFORE YouTube/campaign so a failure in
    // those later (auth/scope/quota) can never throw away a video that already
    // rendered. "Video ready / review" must appear the moment the render lands.
    try { await updateListing(listing.listingId, { videoUrl: video.videoUrl } as any); } catch { /* non-fatal */ }
    updateJob(listing.listingId, { stage: 'uploading', format: video.format, videoUrl: video.videoUrl });

    // 3b) Host on YouTube — NON-FATAL. If it fails, the raw render is still the
    //     reviewable video; we just can't create a YouTube ad campaign for it.
    let youtube: VideoAdResult['youtube'];
    try {
      youtube = await uploadVideoToYouTube({
        videoUrl: video.videoUrl,
        title: (bestHook || product.productName).slice(0, 95),
        description: bestHook || video.brief.hooks[0],
      });
      // Prefer the YouTube watch URL for review once hosted.
      try { await updateListing(listing.listingId, { videoUrl: youtube.watchUrl } as any); } catch { /* non-fatal */ }
      updateJob(listing.listingId, { videoUrl: youtube.watchUrl });
    } catch (e: any) {
      // Keep the raw render as the reviewable video; surface why YouTube failed.
      youtube = undefined;
    }

    // 4) PAUSED video campaign — needs a YouTube video id, so skip cleanly if the
    //    upload failed. Go-live happens in the autonomous sequence. Non-fatal.
    updateJob(listing.listingId, { stage: 'launching' });
    let videoCampaign: VideoAdResult['videoCampaign'];
    if (youtube?.videoId) {
      try {
        const cfg: CampaignConfig = { dailyBudget: DEFAULT_DAILY_BUDGET, geoTargeting: ['US'], maxCPC: 1.5 };
        const created = await createVideoCampaign(product, youtube.videoId, cfg);
        videoCampaign = { status: 'created_paused', campaignId: created.campaignId };
        updateJob(listing.listingId, { stage: 'ready', campaignId: created.campaignId });
      } catch (e: any) {
        videoCampaign = { status: 'failed', error: e?.message || String(e) };
        updateJob(listing.listingId, { stage: 'ready' }); // creative is rendered + hosted
      }
    } else {
      videoCampaign = { status: 'failed', error: 'YouTube upload failed — video rendered and reviewable, but no YouTube id for an ad campaign.' };
      updateJob(listing.listingId, { stage: 'ready' }); // raw render is reviewable
    }

    return { listingId: listing.listingId, sourceVideoUrl: video.videoUrl, youtube, virality, videoCampaign };
  } catch (e: any) {
    failJob(listing.listingId, e?.message || String(e));
    throw e;
  }
}
