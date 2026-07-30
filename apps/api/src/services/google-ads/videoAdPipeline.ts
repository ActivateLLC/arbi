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
import { videoModelId } from './higgsfieldRest';
import { uploadVideoToYouTube } from './youtubeUpload';
import { createVideoCampaign, CampaignConfig, DEFAULT_DAILY_BUDGET } from './campaignAutomation';
import { scoreVariations } from '../ai/viralityScorer';
import { cjClient, isCJConfigured } from '../cjDropshipping';
import { extractReviews } from '../cjSourcing';
import { getAutonomousSettings } from '../autonomousSettings';
import { startJob, updateJob, failJob } from './videoJobs';

export interface VideoAdResult {
  listingId: string;
  sourceVideoUrl?: string;
  youtube?: { videoId: string; watchUrl: string; privacyStatus: string };
  virality?: { bestIndex: number; source: string; scores: any[]; score: number };
  posted?: boolean; // auto-posted to YouTube (passed the virality gate)
  videoCampaign?: { status: 'created_paused' | 'failed'; campaignId?: string; error?: string };
}

/** Minimum predicted-virality score (0-100) to AUTO-POST a video to YouTube +
 *  create an ad campaign. Below this we still render + store the asset (so it's
 *  reviewable/downloadable) but don't publish it. Override via VIRALITY_MIN. */
const VIRALITY_MIN = Math.max(0, Math.min(100, Number(process.env.VIRALITY_MIN) || 60));

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
    // 1) Best hook (virality-scored). We KEEP the winning hook's score and use it
    //    below to gate auto-posting — render everything, publish only winners.
    updateJob(listing.listingId, { stage: 'scripting' });
    let bestHook: string | undefined;
    let virality: VideoAdResult['virality'];
    let viralityScore = 60;        // neutral default
    let viralitySource: 'ai' | 'fallback' = 'fallback';
    try {
      const hooks = buildHooks(product).slice(0, 5);
      const scored = await scoreVariations(hooks.map((h) => ({ hook: h })));
      bestHook = hooks[scored.bestIndex];
      viralityScore = scored.scores[scored.bestIndex]?.score ?? 60;
      viralitySource = scored.source;
      virality = { bestIndex: scored.bestIndex, source: scored.source, scores: scored.scores, score: viralityScore };
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

    // PERSIST THE RAW RENDER IMMEDIATELY as a downloadable ASSET (proof) — before
    // YouTube/campaign, so a later failure can never throw away a rendered video.
    const asset = {
      url: video.videoUrl,
      model: videoModelId(),
      format: video.format,
      durationSec: Number(process.env.HF_VIDEO_DURATION) || 10,
      viralityScore,
      posted: false,
      createdAt: new Date().toISOString(),
    };
    const priorAssets: any[] = Array.isArray(listing.videoAssets) ? listing.videoAssets : [];
    const videoAssets = [asset, ...priorAssets].slice(0, 25);
    try { await updateListing(listing.listingId, { videoUrl: video.videoUrl, videoAssets } as any); } catch { /* non-fatal */ }
    updateJob(listing.listingId, { stage: 'uploading', format: video.format, videoUrl: video.videoUrl });

    // 3b) VIRALITY GATE — auto-post to YouTube ONLY when the winning creative
    //     scores high enough (or when AI scoring is unavailable, so we never block
    //     on a missing scorer). Below the bar, the render stays a reviewable asset
    //     but isn't published. THIS is the "post viral videos" rule, now plugged in.
    const shouldPost = viralitySource === 'fallback' || viralityScore >= VIRALITY_MIN;
    let youtube: VideoAdResult['youtube'];
    let videoCampaign: VideoAdResult['videoCampaign'];

    if (!shouldPost) {
      updateJob(listing.listingId, { stage: 'ready' }); // rendered + stored, intentionally not posted
      videoCampaign = { status: 'failed', error: `Virality ${viralityScore} < ${VIRALITY_MIN} — rendered + saved, not auto-posted.` };
      return { listingId: listing.listingId, sourceVideoUrl: video.videoUrl, virality, posted: false, videoCampaign };
    }

    // ORGANIC-FIRST: post as a PUBLIC YouTube Short for free reach (the discovery
    // engine). Otherwise unlisted (a paid ad asset only). Public posts get #Shorts
    // so YouTube treats the vertical clip as a Short.
    const organicFirst = getAutonomousSettings().organicFirst;
    const title = (bestHook || product.productName).slice(0, organicFirst ? 90 : 95);
    // Host on YouTube — NON-FATAL. If it fails, the raw render is still reviewable.
    try {
      youtube = await uploadVideoToYouTube({
        videoUrl: video.videoUrl,
        title: organicFirst ? `${title} #Shorts` : title,
        description: `${bestHook || video.brief.hooks[0]}${organicFirst ? '\n\n#Shorts #fyp' : ''}`,
        privacyStatus: organicFirst ? 'public' : 'unlisted',
      });
      try {
        await updateListing(listing.listingId, {
          videoUrl: youtube.watchUrl,
          videoAssets: [{ ...asset, youtubeUrl: youtube.watchUrl, posted: true }, ...priorAssets].slice(0, 25),
        } as any);
      } catch { /* non-fatal */ }
      updateJob(listing.listingId, { videoUrl: youtube.watchUrl });
    } catch (e: any) {
      youtube = undefined; // keep raw render as the reviewable asset
    }

    // 4) PAUSED video campaign — needs a YouTube video id; skip cleanly if upload
    //    failed. Go-live happens in the autonomous sequence. Non-fatal.
    updateJob(listing.listingId, { stage: 'launching' });
    if (youtube?.videoId) {
      try {
        const cfg: CampaignConfig = { dailyBudget: DEFAULT_DAILY_BUDGET, geoTargeting: ['US'], maxCPC: 1.5 };
        const created = await createVideoCampaign(product, youtube.videoId, cfg);
        videoCampaign = { status: 'created_paused', campaignId: created.campaignId };
        updateJob(listing.listingId, { stage: 'ready', campaignId: created.campaignId });
      } catch (e: any) {
        videoCampaign = { status: 'failed', error: e?.message || String(e) };
        updateJob(listing.listingId, { stage: 'ready' });
      }
    } else {
      videoCampaign = { status: 'failed', error: 'YouTube upload failed — video rendered and reviewable, but no YouTube id for an ad campaign.' };
      updateJob(listing.listingId, { stage: 'ready' });
    }

    return { listingId: listing.listingId, sourceVideoUrl: video.videoUrl, youtube, virality, posted: !!youtube?.videoId, videoCampaign };
  } catch (e: any) {
    failJob(listing.listingId, e?.message || String(e));
    throw e;
  }
}
