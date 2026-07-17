/**
 * Autonomous System Control API
 *
 * Start/stop autonomous operations:
 * - Automatic opportunity scanning
 * - Automatic listing on marketplace
 * - Automatic execution (when configured)
 */

import { Router } from 'express';
import { autonomousListing } from '../jobs/autonomousListing';
import type { Request, Response } from 'express';
import { getAutonomousSettings, setAutonomousSettings } from '../services/autonomousSettings';
import { runCycleNow } from '../jobs/autonomousEngine';
import { listCampaigns, campaignProductKey, productCampaignKey } from '../services/google-ads/campaignAutomation';
import { checkAdvertisable } from '../services/google-ads/advertisability';
import { getListings, MarketplaceListing } from '../routes/marketplace';
import { cleanupCampaigns } from '../services/google-ads/campaignCleanup';
const router = Router();

/**
 * Clean up the Google Ads account: REMOVE brand/trademark campaigns and
 * duplicate campaigns (keeping the best one per product). GET = dry run
 * (browser-clickable, lists what would go); POST = execute.
 */
async function handleCleanupCampaigns(req: Request, res: Response) {
  const dryRun = req.method === 'GET' || req.query.preview === '1' || req.body?.preview === true;
  try {
    const result = await cleanupCampaigns({ dryRun });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}
router.get('/cleanup-campaigns', handleCleanupCampaigns);
router.post('/cleanup-campaigns', handleCleanupCampaigns);

/**
 * GET /api/autonomous-control/settings — current autonomous-engine settings.
 * POST /api/autonomous-control/settings — toggle autonomy at runtime (no redeploy).
 * Body: { autonomous?, autoSource?, autoCreate?, autoGoLive?, optimize? } (booleans)
 */
router.get('/settings', (_req: Request, res: Response) => {
  res.json({ success: true, settings: getAutonomousSettings() });
});

router.post('/settings', (req: Request, res: Response) => {
  const settings = setAutonomousSettings(req.body || {});
  // If the operator just turned the engine on (or flipped Auto Go-Live on while
  // autonomous), kick a pass NOW so go-live/sourcing happens immediately instead
  // of waiting up to a full interval. Fire-and-forget — don't block the response.
  if (settings.autonomous && (settings.autoGoLive || settings.autoCreate || settings.autoSource || settings.optimize)) {
    void runCycleNow();
  }
  res.json({ success: true, settings });
});

/**
 * GET /api/autonomous-control/go-live-preview — read-only diagnosis of what the
 * AUTO_GO_LIVE pass WOULD do right now. Runs the SAME advertisability gate the
 * engine uses, against live Google Ads campaigns + the active catalog, but never
 * enables anything (no spend). For each PAUSED "Arbi - " campaign it reports
 * whether it would go live and, if not, exactly why (no matching listing in the
 * catalog, or the listing failed the sourcing/stock gate — with the reason).
 */
router.get('/go-live-preview', async (_req: Request, res: Response) => {
  try {
    const cap = Math.max(Number(process.env.AUTO_GO_LIVE_MAX) || 5, 1);
    const campaigns = (await listCampaigns()) as any[];
    const listings = (await getListings('active')) as MarketplaceListing[];

    // Best listing per product key (highest demand), plus its gate result.
    const byKey = new Map<string, { listing: MarketplaceListing; demand: number }>();
    for (const l of listings) {
      const k = productCampaignKey(String(l.productTitle || ''));
      if (!k) continue;
      const demand = Number((l as any).demandScore) || 0;
      const cur = byKey.get(k);
      if (!cur || demand > cur.demand) byKey.set(k, { listing: l, demand });
    }

    const liveKeys = new Set(campaigns.filter((c) => c.status === 'ENABLED').map((c) => campaignProductKey(c.name)));
    const pausedArbi = campaigns
      .filter((c) => c.status === 'PAUSED' && /^Arbi - /.test(c.name || ''))
      .sort((a, b) => (byKey.get(campaignProductKey(b.name))?.demand || 0) - (byKey.get(campaignProductKey(a.name))?.demand || 0));

    let wouldEnable = 0;
    const seen = new Set<string>();
    const detail = pausedArbi.map((c) => {
      const key = campaignProductKey(c.name);
      const match = byKey.get(key);
      let advertisable = false;
      let reason: string | undefined;
      if (!match) {
        reason = 'no matching active listing in catalog';
      } else {
        const g = checkAdvertisable(match.listing);
        advertisable = g.ok;
        reason = g.ok ? undefined : g.reason;
      }
      let willGoLive = false;
      if (advertisable && key && !liveKeys.has(key) && !seen.has(key) && wouldEnable < cap) {
        willGoLive = true;
        wouldEnable++;
        seen.add(key);
      }
      return {
        campaignId: c.id,
        name: c.name,
        productKey: key,
        matchedListingId: match?.listing.listingId,
        demandScore: match?.demand ?? 0,
        advertisable,
        alreadyLive: liveKeys.has(key),
        willGoLive,
        reason,
      };
    });

    res.json({
      success: true,
      settings: getAutonomousSettings(),
      cap,
      counts: {
        totalCampaigns: campaigns.length,
        enabled: campaigns.filter((c) => c.status === 'ENABLED').length,
        pausedArbi: pausedArbi.length,
        advertisable: detail.filter((d) => d.advertisable).length,
        wouldGoLiveThisPass: wouldEnable,
        activeListings: listings.length,
      },
      campaigns: detail,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

/**
 * POST /api/autonomous-control/start-listing
 * Start autonomous listing job
 */
router.post('/start-listing', async (req: Request, res: Response) => {
  const {
    scanIntervalMinutes = 60,
    minScore = 75,
    minProfit = 3, // tiny fee-cover floor; ROI% is the real gate (price-neutral)
    minROI = 15,
    markupPercentage = 30,
    maxListingsPerRun = 10,
  } = req.body;

  try {
    await autonomousListing.start({
      scanIntervalMinutes,
      minScore,
      minProfit,
      minROI,
      markupPercentage,
      maxListingsPerRun,
    });

    res.status(200).json({
      success: true,
      message: 'Autonomous listing started',
      config: {
        scanIntervalMinutes,
        minScore,
        minProfit,
        minROI,
        markupPercentage,
        maxListingsPerRun,
      },
      status: autonomousListing.getStatus(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/autonomous-control/stop-listing
 * Stop autonomous listing job
 */
router.post('/stop-listing', (req: Request, res: Response) => {
  autonomousListing.stop();

  res.status(200).json({
    success: true,
    message: 'Autonomous listing stopped',
    status: autonomousListing.getStatus(),
  });
});

/**
 * GET /api/autonomous-control/status
 * Get autonomous system status
 */
router.get('/status', (req: Request, res: Response) => {
  const listingStatus = autonomousListing.getStatus();

  res.status(200).json({
    autonomous: {
      listing: listingStatus,
    },
    capabilities: {
      autoScanning: true,
      autoListing: true,
      autoExecution: false, // Not yet implemented - needs real supplier APIs
      autoPayout: true, // Available with Stripe
    },
    nextSteps: {
      forFullAutonomy: [
        'Add real supplier purchase APIs (Amazon, Walmart, Target)',
        'Implement payment routing with virtual cards',
        'Build buyer marketplace frontend',
        'Configure auto-execution settings',
      ],
    },
  });
});

/**
 * POST /api/autonomous-control/configure
 * Configure autonomous system settings
 */
router.post('/configure', async (req: Request, res: Response) => {
  const {
    enableAutoListing = true,
    enableAutoExecution = false,
    budgetLimits = {
      dailyLimit: 1000,
      perOpportunityMax: 400,
      monthlyLimit: 10000,
    },
    qualityThresholds = {
      minScore: 75,
      minProfit: 20,
      minROI: 15,
    },
  } = req.body;

  // Store configuration (in production, save to database)
  const config = {
    enableAutoListing,
    enableAutoExecution,
    budgetLimits,
    qualityThresholds,
    updatedAt: new Date(),
  };

  // Start auto-listing if enabled
  if (enableAutoListing) {
    await autonomousListing.start({
      scanIntervalMinutes: 60,
      minScore: qualityThresholds.minScore,
      minProfit: qualityThresholds.minProfit,
      minROI: qualityThresholds.minROI,
      markupPercentage: 30,
      maxListingsPerRun: 10,
    });
  } else {
    autonomousListing.stop();
  }

  res.status(200).json({
    success: true,
    message: 'Autonomous system configured',
    config,
    status: {
      autoListing: autonomousListing.getStatus(),
      autoExecution: { running: false, reason: 'Requires supplier API integration' },
    },
  });
});

export default router;
