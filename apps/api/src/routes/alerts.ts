/**
 * Action Items / Alerts API
 *
 * GET /api/alerts — a prioritized list of things the OPERATOR needs to act on:
 * top off Google Ads billing, raise a budget that's capping out, deal with
 * out-of-stock products, turn the engine on, connect a missing integration, etc.
 *
 * Every alert is computed from live state (settings, campaigns, listings,
 * integration env) — nothing hardcoded — and carries an `action` with either an
 * external `href` (deep link to the right console) or an `internal` key the
 * Command Center maps to a one-tap handler (go live, source products, optimize).
 *
 * Severity: critical (revenue blocked) > warning (needs attention) > info (FYI).
 * Best-effort: any data fetch that throws becomes its own alert, never a 500.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getAutonomousSettings } from '../services/autonomousSettings';
import { listCampaigns } from '../services/google-ads/campaignAutomation';
import { checkAdvertisable, isBrandRestricted } from '../services/google-ads/advertisability';
import { getListings, MarketplaceListing } from '../routes/marketplace';

const router = Router();

type Severity = 'critical' | 'warning' | 'info';
interface ActionAlert {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  action?: { label: string; href?: string; internal?: string };
}

const env = (k: string) => (process.env[k] || '').trim();
const GOOGLE_ADS_BILLING_URL = 'https://ads.google.com/aw/billing/summary';
const GOOGLE_ADS_CAMPAIGNS_URL = 'https://ads.google.com/aw/campaigns';

router.get('/', async (_req: Request, res: Response) => {
  const alerts: ActionAlert[] = [];
  const settings = getAutonomousSettings();

  // --- Integrations ---
  // NOTE: platform/backend integrations that ARBI Inc provisions and manages
  // (AI providers, CJ sourcing, etc.) are intentionally NOT surfaced as operator
  // action items — the operator can't and shouldn't act on those. We only alert
  // on the operator's own money rails (Stripe payouts, Google Ads billing/spend).
  const googleAdsOk = !!(env('GOOGLE_ADS_CLIENT_ID') && env('GOOGLE_ADS_CLIENT_SECRET') &&
    env('GOOGLE_ADS_REFRESH_TOKEN') && env('GOOGLE_ADS_DEVELOPER_TOKEN') && env('GOOGLE_ADS_CUSTOMER_ID'));

  // --- Catalog / stock (DB) ---
  let listings: MarketplaceListing[] = [];
  try {
    listings = (await getListings('active')) as MarketplaceListing[];
  } catch (e: any) {
    alerts.push({ id: 'catalog-error', severity: 'warning', title: 'Could not read the catalog', message: e?.message || 'Database read failed.' });
  }
  const advertisable = listings.filter((l) => checkAdvertisable(l).ok);

  // Non-advertisable junk: brand/trademark OR placeholder/no-real-image seed/demo
  // products (e.g. "Premium Espresso Machine", "Test - …") that can't be sold.
  const restricted = listings.filter((l) => !checkAdvertisable(l).ok);
  if (restricted.length > 0) {
    alerts.push({
      id: 'restricted-products', severity: 'warning',
      title: `${restricted.length} product${restricted.length === 1 ? '' : 's'} can't be advertised`,
      message: `Brand/trademark or placeholder/seed items (e.g. ${restricted.slice(0, 2).map((l) => l.productTitle.slice(0, 28)).join(', ')}…) can't be sold. Remove them to keep the catalog real.`,
      action: { label: 'Remove them', internal: 'purgeRestricted' },
    });
  }

  if (listings.length === 0) {
    alerts.push({
      id: 'no-products', severity: 'warning',
      title: 'No products yet — source some to start',
      message: 'Your catalog is empty. Source in-demand products so the engine has something to advertise and sell.',
      action: { label: 'Source products', internal: 'sourceProducts' },
    });
  }

  try {
    const oos = (await getListings('out_of_stock')) as MarketplaceListing[];
    if (oos.length > 0) {
      alerts.push({
        id: 'out-of-stock', severity: 'warning',
        title: `${oos.length} product${oos.length > 1 ? 's' : ''} out of stock`,
        message: 'These were auto-paused so you don\'t pay for ads you can\'t fulfill. This clears them and sources fresh replacements.',
        action: { label: 'Clear & restock', internal: 'clearOutOfStock' },
      });
    }
  } catch { /* non-fatal */ }

  // --- Campaigns (Google Ads API — may fail; wrap) ---
  if (googleAdsOk) {
    try {
      const campaigns = (await listCampaigns()) as any[];
      const enabled = campaigns.filter((c) => c.status === 'ENABLED');
      const totalImpressions = enabled.reduce((s, c) => s + (Number(c.impressions) || 0), 0);
      const totalSpend = enabled.reduce((s, c) => s + (Number(c.spend) || 0), 0);

      // Brand/duplicate campaign clutter → offer one-tap cleanup.
      const ours = campaigns.filter((c) => /^Arbi - /i.test(c.name || '') && c.status !== 'REMOVED');
      const keyCount = new Map<string, number>();
      let brandCampaigns = 0;
      for (const c of ours) {
        if (isBrandRestricted(String(c.name).replace(/^Arbi\s*-\s*/i, '').replace(/\s*-\s*[A-Za-z]{2}\s*-\s*\d+\s*$/, ''))) { brandCampaigns++; continue; }
        const k = String(c.name).toLowerCase().replace(/^arbi\s*-\s*/, '').replace(/\s*-\s*[a-z]{2}\s*-\s*\d+\s*$/i, '').trim();
        keyCount.set(k, (keyCount.get(k) || 0) + 1);
      }
      const duplicateExtras = Array.from(keyCount.values()).reduce((s, n) => s + Math.max(0, n - 1), 0);
      // Duplicate catalog products (same normalized title listed more than once).
      const titleCount = new Map<string, number>();
      for (const l of listings) {
        const k = (l.productTitle || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
        if (k) titleCount.set(k, (titleCount.get(k) || 0) + 1);
      }
      const duplicateListings = Array.from(titleCount.values()).reduce((s, n) => s + Math.max(0, n - 1), 0);
      const clutter = brandCampaigns + duplicateExtras + duplicateListings;
      if (clutter > 0) {
        const parts = [
          brandCampaigns ? `${brandCampaigns} brand/trademark` : '',
          duplicateExtras ? `${duplicateExtras} duplicate campaign(s)` : '',
          duplicateListings ? `${duplicateListings} duplicate product(s)` : '',
        ].filter(Boolean).join(', ');
        alerts.push({
          id: 'campaign-cleanup', severity: 'warning',
          title: `${clutter} item${clutter === 1 ? '' : 's'} to clean up`,
          message: `${parts}. Clean up removes brand/duplicate campaigns AND de-duplicates the catalog.`,
          action: { label: 'Clean up', internal: 'cleanupCampaigns' },
        });
      }

      // Engine off while there's something ready to launch.
      if (!settings.autonomous && (advertisable.length > 0 || campaigns.some((c) => c.status === 'PAUSED'))) {
        alerts.push({
          id: 'engine-off', severity: 'warning',
          title: 'Engine is off — ads are not launching',
          message: `You have ${advertisable.length} ready-to-advertise product${advertisable.length === 1 ? '' : 's'}, but Auto Go-Live is off so nothing is going live.`,
          action: { label: 'Turn on Auto Go-Live', internal: 'goLive' },
        });
      }

      // Ads enabled but not serving → almost always billing not set up / in review.
      if (enabled.length > 0 && totalImpressions === 0) {
        alerts.push({
          id: 'ads-not-serving', severity: 'critical',
          title: 'Ads are live but not serving — check billing',
          message: `${enabled.length} campaign${enabled.length === 1 ? ' is' : 's are'} enabled but have 0 impressions. This usually means Google Ads billing isn't set up, a payment failed, or the campaigns are still in review.`,
          action: { label: 'Open Google Ads billing', href: GOOGLE_ADS_BILLING_URL },
        });
      }

      // Budget capping out: an enabled campaign spending at/near its daily budget
      // is losing impressions to the cap — raising it captures more demand.
      const capped = enabled.filter((c) => Number(c.dailyBudget) > 0 && Number(c.spend) >= Number(c.dailyBudget) * 0.9);
      if (capped.length > 0) {
        alerts.push({
          id: 'budget-capped', severity: 'info',
          title: `${capped.length} campaign${capped.length === 1 ? '' : 's'} hitting the daily budget`,
          message: `${capped.map((c) => c.name).slice(0, 3).join(', ')}${capped.length > 3 ? '…' : ''} ${capped.length === 1 ? 'is' : 'are'} spending the full daily budget — raise it to capture more demand.`,
          action: { label: 'Adjust budgets in Google Ads', href: GOOGLE_ADS_CAMPAIGNS_URL },
        });
      }

      // Low remaining balance heuristic isn't available via the campaign read, but
      // a sudden stop (enabled, had spend, now 0 impressions today) is covered by
      // ads-not-serving above. Surface a top-off reminder when spending is active.
      if (enabled.length > 0 && totalSpend > 0 && totalImpressions > 0) {
        alerts.push({
          id: 'billing-topoff', severity: 'info',
          title: 'Ads are spending — keep billing topped off',
          message: `Live campaigns have spent $${totalSpend.toFixed(2)}. Make sure your Google Ads payment method has balance so delivery doesn't pause.`,
          action: { label: 'Check Google Ads billing', href: GOOGLE_ADS_BILLING_URL },
        });
      }
    } catch (e: any) {
      alerts.push({
        id: 'google-ads-error', severity: 'warning',
        title: 'Could not reach Google Ads',
        message: e?.message || 'The Google Ads API call failed. Check credentials and account status.',
        action: { label: 'Open Google Ads', href: GOOGLE_ADS_CAMPAIGNS_URL },
      });
    }
  }

  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);

  res.json({
    success: true,
    generatedAt: new Date().toISOString(),
    counts: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    },
    alerts,
  });
});

export default router;
