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
  ProductAdData,
  CampaignConfig,
} from '../services/google-ads/campaignAutomation';
import { runOptimizationPass } from '../services/google-ads/campaignOptimizer';
import { sourceTrendingFromCJ } from '../services/cjSourcing';
import { sourceTrendingFromAmazon, isAmazonSourcingConfigured } from '../services/amazonSourcing';

const logger = createLogger();
const flag = (k: string) => (process.env[k] || '').toLowerCase() === 'true';

const CAMPAIGN_CONFIG: CampaignConfig = {
  dailyBudget: 20,
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
        productId: l.listingId,
        productName: l.productTitle,
        productPrice: price,
        profitMargin,
        category: l.supplierPlatform || 'general',
        targetCountry: 'US',
        landingPageUrl: `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/product/${l.listingId}`,
      } as ProductAdData;
    })
    .filter((p) => p.profitMargin >= minMargin)
    .sort((a, b) => b.profitMargin - a.profitMargin)
    .slice(0, limit);
}

async function cycle(): Promise<void> {
  // 0) Source fresh products from every configured retailer (CJ + Amazon).
  if (flag('AUTO_SOURCE')) {
    try {
      const cj = await sourceTrendingFromCJ({ count: 5 }).catch((e) => ({ sourced: 0, error: e?.message }));
      let amz: any = { sourced: 0 };
      if (isAmazonSourcingConfigured()) amz = await sourceTrendingFromAmazon({ count: 5 }).catch((e) => ({ sourced: 0, error: e?.message }));
      logger.info(`🤖 AUTO_SOURCE: CJ +${cj.sourced || 0}, Amazon +${amz.sourced || 0}`);
    } catch (e: any) {
      logger.error('🤖 AUTO_SOURCE error:', e?.message || e);
    }
  }

  // 1) Create PAUSED campaigns for new high-margin products (skip ones that
  //    already have a campaign, so we don't duplicate every cycle).
  if (flag('AUTO_CREATE')) {
    try {
      const products = activeProducts(await getListings('active'), 5, 30);
      const existing = await listCampaigns();
      const existingNames = (existing as any[]).map((c) => (c.name || '').toLowerCase());
      const toCreate = products.filter(
        (p) => !existingNames.some((n) => n.includes(p.productName.toLowerCase().slice(0, 30)))
      );
      if (toCreate.length) {
        const r = await createBulkCampaigns(toCreate, CAMPAIGN_CONFIG);
        logger.info(`🤖 AUTO_CREATE: created ${r.success} PAUSED campaign(s), ${r.failed} failed`);
      }
    } catch (e: any) {
      logger.error('🤖 AUTO_CREATE error:', e?.message || e);
    }
  }

  // 2) Take our PAUSED campaigns LIVE (the real-spend switch).
  if (flag('AUTO_GO_LIVE')) {
    try {
      const campaigns = await listCampaigns();
      const paused = (campaigns as any[]).filter((c) => c.status === 'PAUSED' && /^Arbi - /.test(c.name || ''));
      for (const c of paused) {
        await setCampaignStatus(c.id, 'ENABLED');
        logger.info(`🤖 AUTO_GO_LIVE: enabled campaign ${c.id} (${c.name})`);
      }
    } catch (e: any) {
      logger.error('🤖 AUTO_GO_LIVE error:', e?.message || e);
    }
  }

  // 3) Optimize live campaigns (scale winners, pause losers). On by default.
  if ((process.env.AUTO_OPTIMIZE || 'true').toLowerCase() !== 'false') {
    try {
      const r = await runOptimizationPass();
      if (r.acted) logger.info(`🤖 OPTIMIZE: ${r.acted}/${r.evaluated} actions — ${r.actions.map((a) => `${a.name}:${a.action}`).join(', ')}`);
    } catch (e: any) {
      logger.error('🤖 OPTIMIZE error:', e?.message || e);
    }
  }
}

/**
 * Start the autonomous engine. No-op unless ENABLE_AUTONOMOUS=true, so deploying
 * this never spends money on its own.
 */
export function startAutonomousEngine(): void {
  if (!flag('ENABLE_AUTONOMOUS')) {
    logger.info('🤖 Autonomous engine OFF (set ENABLE_AUTONOMOUS=true to enable 24/7 automation)');
    return;
  }
  const minutes = Math.max(Number(process.env.AUTONOMOUS_INTERVAL_MIN) || 60, 15);
  logger.info(`🤖 Autonomous engine ON — every ${minutes}m | source=${flag('AUTO_SOURCE')} create=${flag('AUTO_CREATE')} goLive=${flag('AUTO_GO_LIVE')} optimize=${(process.env.AUTO_OPTIMIZE || 'true') !== 'false'}`);
  // First run shortly after boot, then on the interval.
  setTimeout(() => { cycle().catch((e) => logger.error('🤖 cycle error:', e)); }, 30_000);
  setInterval(() => { cycle().catch((e) => logger.error('🤖 cycle error:', e)); }, minutes * 60_000);
}
