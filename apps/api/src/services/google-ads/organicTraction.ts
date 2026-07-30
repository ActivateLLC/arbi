/**
 * Organic traction — the free-exposure demand signal for the organic-first model.
 *
 * Polls YouTube view/engagement counts for the Shorts we posted and stores them
 * on each listing. This is what PROVES a product organically before any paid
 * budget is amplified onto it (and a far more trustworthy demand signal than CJ's
 * seller-count proxy). Read-only against YouTube; no-ops gracefully.
 */
import { getListings, updateListing } from '../../routes/marketplace';
import { getVideoStats, youtubeVideoId } from './youtubeStats';

/** The view count a product's Short must clear before paid go-live amplifies it. */
export const ORGANIC_PROOF_VIEWS = Math.max(0, Number(process.env.ORGANIC_PROOF_VIEWS) || 1000);

/** Refresh organic stats for every active listing that has a posted YouTube video. */
export async function refreshOrganicStats(): Promise<{ checked: number; updated: number }> {
  let active: any[] = [];
  try { active = (await getListings('active')) as any[]; } catch { return { checked: 0, updated: 0 }; }

  const idByListing = new Map<string, string>();
  for (const l of active) {
    const fromAsset = Array.isArray(l.videoAssets) ? l.videoAssets.find((a: any) => a?.youtubeUrl)?.youtubeUrl : undefined;
    const vid = youtubeVideoId(fromAsset || l.videoUrl);
    if (vid) idByListing.set(l.listingId, vid);
  }
  if (!idByListing.size) return { checked: 0, updated: 0 };

  const stats = await getVideoStats(Array.from(idByListing.values()));
  let updated = 0;
  for (const [listingId, vid] of idByListing) {
    const s = stats[vid];
    if (!s) continue;
    try {
      await updateListing(listingId, { organicViews: s.views, organicLikes: s.likes, organicCheckedAt: new Date() } as any);
      updated++;
    } catch { /* keep going */ }
  }
  return { checked: idByListing.size, updated };
}
