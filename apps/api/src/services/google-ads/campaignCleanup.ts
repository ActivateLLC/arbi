/**
 * Google Ads account cleanup.
 *
 * The autonomous engine (and earlier manual launches) can leave the account
 * cluttered with two kinds of junk:
 *  1. BRAND/trademark campaigns created before the brand guard existed
 *     (e.g. "Arbi - Nintendo Switch OLED…", "Arbi - Apple AirPods Pro 2…") —
 *     these can never legitimately serve and should be removed.
 *  2. DUPLICATE campaigns for the same product (the same item launched several
 *     times across cycles) — we keep the best one and remove the rest.
 *
 * "Best" = an ENABLED campaign with the most impressions wins; ties/empties keep
 * the most recent (highest id). We only ever REMOVE brand + extra duplicates;
 * the single keeper per product is left exactly as-is (enabled or paused).
 *
 * REMOVE is reversible-ish in Google Ads (removed campaigns are retained, just
 * not servable) and is what de-clutters the campaigns list. Supports a dry run.
 */

import { listCampaigns, setCampaignStatus, campaignProductKey, campaignProductName } from './campaignAutomation';
import { isBrandRestricted } from './advertisability';

export interface CleanupPlanItem {
  campaignId: string;
  name: string;
  reason: 'brand/trademark' | 'duplicate';
}
export interface CleanupResult {
  dryRun: boolean;
  totalCampaigns: number;
  keep: number;
  toRemove: CleanupPlanItem[];
  removed: number;
  failed: number;
}

/** Score a campaign for "which duplicate to keep": enabled + impressions win. */
function keepScore(c: any): number {
  const enabled = c.status === 'ENABLED' ? 1_000_000_000 : 0;
  const impressions = Number(c.impressions) || 0;
  const id = Number(c.id) || 0;
  return enabled + impressions * 1000 + (id % 1000); // recency breaks ties
}

export async function cleanupCampaigns(opts: { dryRun?: boolean; customerId?: string } = {}): Promise<CleanupResult> {
  const dryRun = opts.dryRun !== false ? opts.dryRun ?? true : false;
  const campaigns = (await listCampaigns(opts.customerId)) as any[];
  // Only consider our own "Arbi - " campaigns; never touch anything else.
  const ours = campaigns.filter((c) => /^Arbi - /i.test(c.name || '') && c.status !== 'REMOVED');

  const toRemove: CleanupPlanItem[] = [];
  const byKey = new Map<string, any[]>();

  for (const c of ours) {
    if (isBrandRestricted(campaignProductName(c.name))) {
      toRemove.push({ campaignId: String(c.id), name: c.name, reason: 'brand/trademark' });
      continue; // brand campaigns are removed regardless of duplicates
    }
    const key = campaignProductKey(c.name);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(c);
  }

  // Within each product key, keep the best campaign, remove the rest as dupes.
  let keep = 0;
  for (const group of byKey.values()) {
    if (group.length === 0) continue;
    group.sort((a, b) => keepScore(b) - keepScore(a));
    keep++; // group[0] is the keeper
    for (const dup of group.slice(1)) {
      toRemove.push({ campaignId: String(dup.id), name: dup.name, reason: 'duplicate' });
    }
  }

  let removed = 0, failed = 0;
  if (!dryRun) {
    for (const item of toRemove) {
      try { await setCampaignStatus(item.campaignId, 'REMOVED', opts.customerId); removed++; }
      catch { failed++; }
    }
  }

  return { dryRun, totalCampaigns: ours.length, keep, toRemove, removed, failed };
}
