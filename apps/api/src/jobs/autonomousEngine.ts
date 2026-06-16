/**
 * Autonomous Engine — the "100% automated, 24/7" loop.
 *
 * On a recurring interval it can: create campaigns for new products, take them
 * LIVE, and continuously optimize spend (scale winners / pause losers). Each
 * money-affecting stage is behind its own env flag so the loop is safe by
 * default and the owner opts into autonomy deliberately:
 *
 *   ENABLE_AUTONOMOUS=true     master switch (engine is OFF unless set)
 *   AUTONOMOUS_INTERVAL_MIN=60 how often the cycle runs (min 15)
 *   AUTO_CREATE=true           auto-create PAUSED campaigns for new products
 *   AUTO_GO_LIVE=true          auto-enable our PAUSED campaigns (REAL SPEND)
 *   AUTO_OPTIMIZE              optimization pass (on by default when autonomous)
 *
 * Safety: optimization only ever scales within a cap or pauses losers; AUTO_GO_LIVE
 * is the single switch that lets the system spend without a human tap.
 */

import { createLogger } from '../utils/logger';
import { getListings } from '../routes/marketplace';
import {
  createBulkCampaigns,
  listCampaigns,
  setCampaignStatus,
  campaignProductKey,
  productCampaignKey,
  demandRank,
  DEFAULT_DAILY_BUDGET,
  ProductAdData,
  CampaignConfig,
} from '../services/google-ads/campaignAutomation';
import { runOptimizationPass } from '../services/google-ads/campaignOptimizer';
import { runProfitGovernor } from '../services/google-ads/profitGovernor';
import { captureSnapshots, latestSnapshotAgeHours, persistRealizedScores } from '../services/google-ads/performanceSnapshots';
import { blendedScore } from '../services/scoring/realizedPerformance';
import { enforceAdvertisable, cleanupCampaigns } from '../services/google-ads/campaignCleanup';
import { reserveCampaignSlot, markCampaignCreated, releaseFailedReservation } from '../services/google-ads/campaignRegistry';
import { DEFAULT_TENANT_ID } from '../services/tenantContext';

// Exactly-once campaign creation via the DB-backed registry (reserve-before-create).
// Kill switch: USE_CAMPAIGN_REGISTRY=false reverts to the legacy fuzzy-name dedup.
const USE_REGISTRY = (process.env.USE_CAMPAIGN_REGISTRY || 'true').toLowerCase() !== 'false';
import { syncAdsToStock } from '../services/google-ads/stockSync';
import { isAdvertisable, advertisableListings } from '../services/google-ads/advertisability';
import { isConfigured as isVideoConfigured } from '../services/google-ads/higgsfieldVideo';
import { createVideoAdForListing } from '../services/google-ads/videoAdPipeline';
import { updateJob as updateVideoJob, getJob as getVideoJob } from '../services/google-ads/videoJobs';
import { sourceTrendingFromCJ } from '../services/cjSourcing';
import { sourceTrendingFromAmazon, isAmazonSourcingConfigured } from '../services/amazonSourcing';
import { getAutonomousSettings } from '../services/autonomousSettings';

const logger = createLogger();

/** Demand score used for ranking. When learningRank is on, blend in realized
 *  performance (confidence-weighted) so we promote what actually converts; with
 *  no data the blend == predicted demand, so behavior is unchanged. */
function effectiveDemand(l: any): number {
  const demand = Number(l.demandScore) || 0;
  if (!getAutonomousSettings().learningRank) return demand;
  return blendedScore(demand, l.realizedScore, l.realizedConfidence);
}

const CAMPAIGN_CONFIG: CampaignConfig = {
  dailyBudget: DEFAULT_DAILY_BUDGET,
  targetROAS: 3.0,
  geoTargeting: ['US'],
  maxCPC: 1.5,
};

/** Map active listings → ProductAdData (mirrors the google-ads route). */
function activeProducts(listings: any[], limit: number, minMargin: number): ProductAdData[] {
  return listings
    .map((l) => {
      const price = Number(l.marketplacePrice) || 0;
      const profit = Number(l.estimatedProfit) || 0;
      const profitMargin = price > 0 ? Math.round((profit / price) * 100) : 0;
      return {
        product: {
          productId: l.listingId,
          productName: l.productTitle,
          productPrice: price,
          profitMargin,
          category: l.supplierPlatform || 'general',
          targetCountry: 'US',
          imageUrl: Array.isArray(l.productImages) ? l.productImages[0] : undefined,
          landingPageUrl: `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/product/${l.listingId}`,
        } as ProductAdData,
        demandScore: effectiveDemand(l),
        profit,
      };
    })
    .filter((x) => x.product.profitMargin >= minMargin)
    // Demand-first: create/promote the most proven products first.
    .sort((a, b) => demandRank(b.demandScore, b.profit) - demandRank(a.demandScore, a.profit))
    .slice(0, limit)
    .map((x) => x.product);
}

async function cycle(): Promise<void> {
  const cfg = getAutonomousSettings();
  if (!cfg.autonomous) return; // master switch (runtime-toggleable from the dashboard)

  // 0) Source fresh products from every configured retailer (CJ + Amazon).
  if (cfg.autoSource) {
    try {
      const cj = await sourceTrendingFromCJ({ count: 5 }).catch((e) => ({ sourced: 0, error: e?.message }));
      let amz: any = { sourced: 0 };
      if (isAmazonSourcingConfigured()) amz = await sourceTrendingFromAmazon({ count: 5 }).catch((e) => ({ sourced: 0, error: e?.message }));
      logger.info(`🤖 AUTO_SOURCE: CJ +${cj.sourced || 0}, Amazon +${amz.sourced || 0}`);
    } catch (e: any) {
      logger.error('🤖 AUTO_SOURCE error:', e?.message || e);
    }
  }

  // 0.5) HYGIENE — enforce "don't advertise what you can't sell" every cycle:
  //      expire seed/placeholder/brand listings (e.g. the leftover "Premium
  //      Espresso Machine" with a placeholder image) and pause any live campaign
  //      for a product that's no longer advertisable. Self-healing, so junk can
  //      never linger in the catalog or keep spending — no manual "Clean up" tap.
  try {
    const h = await enforceAdvertisable();
    if (h.expiredListings || h.pausedCampaigns) {
      logger.info(`🧹 HYGIENE: expired ${h.expiredListings} non-advertisable listing(s), paused ${h.pausedCampaigns} campaign(s)`);
    }
    // Per-cycle duplicate cleanup is RETIRED when the registry is on: duplicates
    // can't form (DB-enforced exactly-once) and a one-time backfill already cleared
    // legacy dupes. We only run it as a fallback when the kill switch is off.
    if (!USE_REGISTRY) {
      const cc = await cleanupCampaigns({ dryRun: false });
      if (cc.removed) logger.info(`🧹 HYGIENE(legacy): removed ${cc.removed} brand/duplicate campaign(s); de-duped ${cc.expiredListings} listing(s)`);
    }
  } catch (e: any) {
    logger.error('🧹 HYGIENE error:', e?.message || e);
  }

  // 1) Create PAUSED campaigns for new high-margin products. Exactly-once is
  //    guaranteed by the registry reservation (the DB unique slot), so there is
  //    no fuzzy name-matching to maintain.
  if (cfg.autoCreate) {
    try {
      // Gate: only advertise properly-sourced, in-stock products (real supplier
      // ref + image + active). Blocks placeholder/hardcoded rows from the funnel.
      const eligible = advertisableListings(await getListings('active'));
      const products = activeProducts(eligible, 5, 30);
      let toCreate = products;
      if (USE_REGISTRY) {
        // Reserve a SEARCH slot per product BEFORE creating — the authoritative,
        // race-proof exactly-once gate. Only the writer that wins the unique
        // (tenant,listing,SEARCH) reservation creates; everything else skips.
        const won: typeof toCreate = [];
        for (const p of toCreate) {
          if ((await reserveCampaignSlot(DEFAULT_TENANT_ID, p.productId, 'SEARCH')) === 'won') won.push(p);
        }
        toCreate = won;
      } else {
        // Legacy fuzzy name-dedup — fallback only when the registry kill switch is off.
        const existing = await listCampaigns();
        const existingNames = (existing as any[]).map((c) => (c.name || '').toLowerCase());
        toCreate = products.filter((p) => !existingNames.some((n) => n.includes(p.productName.toLowerCase().slice(0, 30))));
      }
      if (toCreate.length) {
        const r = await createBulkCampaigns(toCreate, CAMPAIGN_CONFIG);
        if (USE_REGISTRY) {
          // Record the outcome on each reserved slot (create→mark, fail/skip→release).
          const byName = new Map(toCreate.map((p) => [p.productName, p.productId]));
          for (const res of r.results) {
            const listingId = byName.get(res.product);
            if (!listingId) continue;
            if (res.status === 'success' && res.campaignId) {
              await markCampaignCreated(DEFAULT_TENANT_ID, listingId, 'SEARCH', res.campaignId, `Arbi - ${res.product}`);
            } else {
              await releaseFailedReservation(DEFAULT_TENANT_ID, listingId, 'SEARCH', res.error || res.reason || 'not created');
            }
          }
        }
        logger.info(`🤖 AUTO_CREATE: created ${r.success} PAUSED campaign(s), ${r.failed} failed`);
      }
    } catch (e: any) {
      logger.error('🤖 AUTO_CREATE error:', e?.message || e);
    }
  }

  // 2) Take our PAUSED campaigns LIVE — but ONE per product and capped per cycle,
  //    so we test many products at low budget instead of dumping spend on dupes.
  if (cfg.autoGoLive) {
    try {
      const campaigns = (await listCampaigns()) as any[];
      const cap = Math.max(Number(process.env.AUTO_GO_LIVE_MAX) || 5, 1);
      // Products already serving — don't double-enable.
      const liveKeys = new Set(campaigns.filter((c) => c.status === 'ENABLED').map((c) => campaignProductKey(c.name)));
      // Demand map: productCampaignKey(title) → demandScore, so we take the most
      // in-demand PAUSED campaigns live first (not whatever order the API returns).
      // advertisableKeys gates go-live to properly-sourced, in-stock products only.
      const demandByKey = new Map<string, number>();
      const advertisableKeys = new Set<string>();
      for (const l of (await getListings('active')) as any[]) {
        const k = productCampaignKey(String(l.productTitle || ''));
        if (!k) continue;
        demandByKey.set(k, Math.max(demandByKey.get(k) || 0, effectiveDemand(l)));
        if (isAdvertisable(l)) advertisableKeys.add(k);
      }
      const pausedArbi = campaigns
        .filter((c) => c.status === 'PAUSED' && /^Arbi - /.test(c.name || ''))
        .sort((a, b) => (demandByKey.get(campaignProductKey(b.name)) || 0) - (demandByKey.get(campaignProductKey(a.name)) || 0));
      const seen = new Set<string>();
      let enabled = 0;
      for (const c of pausedArbi) {
        if (enabled >= cap) break;
        const key = campaignProductKey(c.name);
        if (!key || liveKeys.has(key) || seen.has(key)) continue; // one per product
        // Don't take live a product that isn't advertisable (OOS / no real supplier).
        if (!advertisableKeys.has(key)) { logger.info(`🤖 AUTO_GO_LIVE: skip ${c.name} — not advertisable (sourcing/stock)`); continue; }
        seen.add(key);
        await setCampaignStatus(c.id, 'ENABLED');
        enabled++;
        logger.info(`🤖 AUTO_GO_LIVE: enabled ${c.id} (${c.name})`);
      }
      if (enabled) logger.info(`🤖 AUTO_GO_LIVE: took ${enabled} campaign(s) live this cycle (cap ${cap})`);
    } catch (e: any) {
      logger.error('🤖 AUTO_GO_LIVE error:', e?.message || e);
    }
  }

  // 2.5) Auto-generate UGC video ads for ALL advertisable products that don't
  //      have one yet — rendered SIMULTANEOUSLY (bounded concurrency) so the
  //      operator sees several "rendering" at once, not one trickling per cycle.
  //      Runs in this background cycle (no HTTP timeout) — the right place for a
  //      1-3 min render. AUTO_VIDEO_CONCURRENCY caps parallel renders (credits/
  //      rate limits); AUTO_VIDEO_MAX caps how many we kick off per cycle.
  if (cfg.autoVideo && isVideoConfigured()) {
    try {
      const eligible = advertisableListings(await getListings('active')) as any[];
      const campaigns = (await listCampaigns()) as any[];
      // Product keys that already have a video campaign ("Arbi Video - <title> …").
      const stripVideo = (n: string) => String(n || '').replace(/^Arbi Video\s*-\s*/i, '').replace(/\s*-\s*[A-Za-z]{2}\s*-\s*\d+\s*$/, '').trim();
      const videoKeys = new Set(
        campaigns.filter((c) => /^Arbi Video - /i.test(c.name || '')).map((c) => productCampaignKey(stripVideo(c.name)))
      );
      const maxPerCycle = Math.max(Number(process.env.AUTO_VIDEO_MAX) || 4, 1);
      // Higgsfield caps concurrent renders per account (observed: 4). Stay UNDER it
      // (default 3) so engine renders don't 400 each other and a manual/diag render
      // still has a slot. submitAndWait also retries the cap-limit 400 as backstop.
      const concurrency = Math.max(Number(process.env.AUTO_VIDEO_CONCURRENCY) || 3, 1);
      // CREDIT SAFETY — render each product AT MOST ONCE. Skip anything that:
      //   • already has a persisted videoUrl (render succeeded before — survives
      //     restarts even if campaign creation later failed), OR
      //   • already has an "Arbi Video -" campaign, OR
      //   • already has an in-memory job (attempted this process — don't re-kick a
      //     timed-out/failed render every cycle and burn Higgsfield credits).
      // Top demand ("most viral") first.
      const queue = eligible
        .sort((a, b) => effectiveDemand(b) - effectiveDemand(a))
        .filter((l) =>
          !l.videoUrl &&
          !videoKeys.has(productCampaignKey(String(l.productTitle || ''))) &&
          !getVideoJob(l.listingId)
        )
        .slice(0, maxPerCycle);

      if (queue.length) {
        logger.info(`🎬 AUTO_VIDEO: rendering ${queue.length} UGC video ad(s) simultaneously (concurrency ${concurrency})`);
        // Bounded-parallel worker pool: `concurrency` renders in flight at once.
        let idx = 0;
        const worker = async (): Promise<void> => {
          while (idx < queue.length) {
            const listing = queue[idx++];
            // EXACTLY-ONCE: reserve the VIDEO slot before rendering. If a concurrent
            // cycle/instance already holds it, skip (no duplicate render, no dup
            // campaign). The videoUrl guard above is the credit backstop.
            if (USE_REGISTRY && (await reserveCampaignSlot(DEFAULT_TENANT_ID, listing.listingId, 'VIDEO')) === 'exists') continue;
            try {
              const r = await createVideoAdForListing(listing);
              // Slot represents a real VIDEO campaign: mark when one was created,
              // release otherwise (rendered-but-not-posted keeps no slot — the
              // persisted videoUrl independently prevents a re-render).
              if (USE_REGISTRY) {
                if (r.videoCampaign?.status === 'created_paused' && r.videoCampaign.campaignId) {
                  await markCampaignCreated(DEFAULT_TENANT_ID, listing.listingId, 'VIDEO', r.videoCampaign.campaignId, `Arbi Video - ${listing.productTitle}`);
                } else {
                  await releaseFailedReservation(DEFAULT_TENANT_ID, listing.listingId, 'VIDEO', r.videoCampaign?.error || 'no campaign');
                }
              }
              logger.info(`🎬 AUTO_VIDEO "${listing.productTitle}": youtube=${r.youtube?.watchUrl ? 'ok' : 'none'} campaign=${r.videoCampaign?.status}${r.videoCampaign?.error ? ` (${r.videoCampaign.error})` : ''}`);
            } catch (e: any) {
              if (USE_REGISTRY) await releaseFailedReservation(DEFAULT_TENANT_ID, listing.listingId, 'VIDEO', e?.message || 'render failed');
              logger.error(`🎬 AUTO_VIDEO "${listing.productTitle}" failed:`, e?.message || e);
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
      }
    } catch (e: any) {
      logger.error('🎬 AUTO_VIDEO error:', e?.message || e);
    }
  }

  // 2.6) Take PAUSED video campaigns LIVE — launching the video ad is part of the
  //      autonomous sequence (not just creating it). Gated by the same Auto
  //      Go-Live spend switch, one per product, capped, advertisable-only. The
  //      search go-live above only matches "Arbi - "; video campaigns are named
  //      "Arbi Video - " and need their own pass.
  if (cfg.autoGoLive) {
    try {
      const campaigns = (await listCampaigns()) as any[];
      const cap = Math.max(Number(process.env.AUTO_GO_LIVE_VIDEO_MAX) || 3, 1);
      const stripVideo = (n: string) => String(n || '').replace(/^Arbi Video\s*-\s*/i, '').replace(/\s*-\s*[A-Za-z]{2}\s*-\s*\d+\s*$/, '').trim();
      const videoKey = (n: string) => productCampaignKey(stripVideo(n));
      // Products already serving a video ad — don't double-enable.
      const liveVideoKeys = new Set(
        campaigns.filter((c) => c.status === 'ENABLED' && /^Arbi Video - /i.test(c.name || '')).map((c) => videoKey(c.name))
      );
      const demandByKey = new Map<string, number>();
      const advertisableKeys = new Set<string>();
      const listingIdByKey = new Map<string, string>();
      for (const l of (await getListings('active')) as any[]) {
        const k = productCampaignKey(String(l.productTitle || ''));
        if (!k) continue;
        demandByKey.set(k, Math.max(demandByKey.get(k) || 0, effectiveDemand(l)));
        if (!listingIdByKey.has(k)) listingIdByKey.set(k, l.listingId);
        if (isAdvertisable(l)) advertisableKeys.add(k);
      }
      const pausedVideo = campaigns
        .filter((c) => c.status === 'PAUSED' && /^Arbi Video - /i.test(c.name || ''))
        .sort((a, b) => (demandByKey.get(videoKey(b.name)) || 0) - (demandByKey.get(videoKey(a.name)) || 0));
      const seen = new Set<string>();
      let enabled = 0;
      for (const c of pausedVideo) {
        if (enabled >= cap) break;
        const key = videoKey(c.name);
        if (!key || liveVideoKeys.has(key) || seen.has(key)) continue;
        if (!advertisableKeys.has(key)) { logger.info(`🎬 AUTO_VIDEO_GO_LIVE: skip ${c.name} — not advertisable`); continue; }
        seen.add(key);
        await setCampaignStatus(c.id, 'ENABLED');
        const lid = listingIdByKey.get(key);
        if (lid) updateVideoJob(lid, { stage: 'live', campaignId: c.id });
        enabled++;
        logger.info(`🎬 AUTO_VIDEO_GO_LIVE: enabled ${c.id} (${c.name})`);
      }
      if (enabled) logger.info(`🎬 AUTO_VIDEO_GO_LIVE: took ${enabled} video campaign(s) live this cycle (cap ${cap})`);
    } catch (e: any) {
      logger.error('🎬 AUTO_VIDEO_GO_LIVE error:', e?.message || e);
    }
  }

  // 2.7) SNAPSHOT — record realized per-campaign performance (read-only, no spend)
  //      and persist each product's blended realized score for learning-ranked
  //      selection. Runs whenever the engine is active; safe + idempotent.
  if (cfg.optimize || cfg.profitGovernor) {
    try {
      const snap = await captureSnapshots();
      if (snap.captured) {
        await persistRealizedScores();
        logger.info(`📈 SNAPSHOT: captured ${snap.captured} (${snap.mapped} mapped), realized scores updated`);
      }
    } catch (e: any) {
      logger.error('📈 SNAPSHOT error:', e?.message || e);
    }
  }

  // 3) Optimize live campaigns. The reinvestment GOVERNOR (account cap + ramp +
  //    reallocation) supersedes the bare optimizer when enabled; otherwise the
  //    proven optimizer runs unchanged. Governor blocks scale-ups on stale data.
  if (cfg.optimize) {
    try {
      if (cfg.profitGovernor) {
        const age = await latestSnapshotAgeHours();
        const fresh = age != null && age <= (cfg.governor?.staleHours ?? 26);
        const r = await runProfitGovernor(undefined, { allowIncreases: fresh, governor: cfg.governor });
        if (r.scaled || r.reduced || r.paused) {
          logger.info(`💰 GOVERNOR: +${r.scaled} scaled, -${r.reduced} reduced, ${r.paused} paused; projected $${r.projectedSpend}/$${r.cap}/day${fresh ? '' : ' (stale: no scale-ups)'}`);
        }
      } else {
        const r = await runOptimizationPass();
        if (r.acted) logger.info(`🤖 OPTIMIZE: ${r.acted}/${r.evaluated} actions — ${r.actions.map((a) => `${a.name}:${a.action}`).join(', ')}`);
      }
    } catch (e: any) {
      logger.error('🤖 OPTIMIZE error:', e?.message || e);
    }
  }

  // 4) Protect spend: pause ads for anything that's gone out of stock.
  try {
    const sg = await syncAdsToStock();
    if (sg.paused.length) logger.info(`🤖 STOCK: paused ${sg.paused.length} out-of-stock campaign(s)`);
  } catch (e: any) {
    logger.error('🤖 STOCK error:', e?.message || e);
  }
}

// Guard so overlapping triggers (interval + a dashboard toggle) don't run the
// money-affecting cycle twice at once.
let cycleRunning = false;

/**
 * Run a single engine pass right now (used when the dashboard toggles autonomy /
 * Auto Go-Live, so go-live happens immediately instead of waiting up to a full
 * interval). Respects the same settings gate as the scheduled cycle, and is
 * a no-op while a cycle is already in flight. Fire-and-forget safe.
 */
export async function runCycleNow(): Promise<void> {
  if (cycleRunning) return;
  cycleRunning = true;
  try {
    await cycle();
  } catch (e: any) {
    logger.error('🤖 runCycleNow error:', e?.message || e);
  } finally {
    cycleRunning = false;
  }
}

/**
 * Start the autonomous engine. No-op unless ENABLE_AUTONOMOUS=true, so deploying
 * this never spends money on its own.
 */
export function startAutonomousEngine(): void {
  // Always ARM the interval; each cycle no-ops unless settings.autonomous is true.
  // This lets the dashboard toggle autonomy on/off at runtime (no redeploy).
  const minutes = Math.max(Number(process.env.AUTONOMOUS_INTERVAL_MIN) || 60, 15);
  const cfg = getAutonomousSettings();
  logger.info(`🤖 Autonomous engine armed — cycle every ${minutes}m (currently ${cfg.autonomous ? 'ON' : 'OFF'}; toggle from the dashboard)`);
  setTimeout(() => { void runCycleNow(); }, 30_000);
  setInterval(() => { void runCycleNow(); }, minutes * 60_000);
}
