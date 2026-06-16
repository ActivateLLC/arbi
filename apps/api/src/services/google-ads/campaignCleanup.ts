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

import { listCampaigns, setCampaignStatus, campaignProductKey, campaignProductName, productCampaignKey } from './campaignAutomation';
import { isBrandRestricted, checkAdvertisable } from './advertisability';
import { getListings, updateListing } from '../../routes/marketplace';
import { reserveCampaignSlot, markCampaignCreated, CampaignChannel } from './campaignRegistry';
import { DEFAULT_TENANT_ID } from '../tenantContext';

/**
 * ONE-TIME backfill — populate the exactly-once mapping from the campaigns that
 * already exist in Google Ads, and remove legacy duplicates/brand campaigns. Runs
 * once at boot (when the mapping is empty); idempotent and safe to re-run. After
 * this, the registry knows every product's keeper campaign, so the engine's
 * reserve-before-create sees them as already-claimed and never re-creates.
 *
 * Safety: picks the BEST campaign per (channel, product) as the keeper, maps it,
 * and removes only the extras — never the keeper, and never a campaign whose
 * product can't be uniquely identified. A sanity cap aborts removal if it would
 * nuke an implausible share of the account (guards a name-parsing bug).
 */
export async function backfillCampaignRegistry(opts: { customerId?: string; dryRun?: boolean } = {}): Promise<{ mapped: number; removed: number; skipped: number }> {
  const dryRun = opts.dryRun ?? false;
  const tenantId = DEFAULT_TENANT_ID;
  const stripVideo = (n: string) => String(n || '').replace(/^Arbi Video\s*-\s*/i, '').replace(/\s*-\s*[A-Za-z]{2}\s*-\s*\d+\s*$/, '').trim();

  const campaigns = (await listCampaigns(opts.customerId)) as any[];
  const ours = campaigns.filter((c) => /^Arbi (Video )?- /i.test(c.name || '') && c.status !== 'REMOVED');
  if (!ours.length) return { mapped: 0, removed: 0, skipped: 0 };

  // Map product key → listingId, but ONLY when exactly one active listing matches
  // (legacy campaigns store no listingId; ambiguous matches are left untouched).
  const listings = (await getListings('active')) as any[];
  const keyToListing = new Map<string, string | null>();
  for (const l of listings) {
    const k = productCampaignKey(String(l.productTitle || ''));
    if (!k) continue;
    keyToListing.set(k, keyToListing.has(k) ? null : l.listingId);
  }

  // Group our campaigns by (channel, product key); the keeper is the best one.
  const groups = new Map<string, Array<{ c: any; channel: CampaignChannel; key: string }>>();
  for (const c of ours) {
    const isVideo = /^Arbi Video - /i.test(c.name);
    const channel: CampaignChannel = isVideo ? 'VIDEO' : 'SEARCH';
    const key = isVideo ? productCampaignKey(stripVideo(c.name)) : campaignProductKey(c.name);
    if (!key) continue;
    const gk = `${channel}|${key}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk)!.push({ c, channel, key });
  }

  let mapped = 0, skipped = 0;
  const toRemove = new Set<string>();
  for (const items of groups.values()) {
    items.sort((a, b) => keepScore(b.c) - keepScore(a.c));
    const keeper = items[0];
    const listingId = keyToListing.get(keeper.key) || null;
    if (listingId) {
      if (!dryRun) {
        await reserveCampaignSlot(tenantId, listingId, keeper.channel, { customerId: opts.customerId });
        await markCampaignCreated(tenantId, listingId, keeper.channel, String(keeper.c.id), keeper.c.name);
      }
      mapped++;
      for (const dup of items.slice(1)) if (String(dup.c.id) !== String(keeper.c.id)) toRemove.add(String(dup.c.id));
    } else {
      // Can't uniquely identify the product — map nothing, remove nothing.
      skipped++;
    }
  }
  // Brand/trademark campaigns are removed regardless (they can never serve).
  for (const c of ours) if (isBrandRestricted(campaignProductName(c.name))) toRemove.add(String(c.id));

  // SANITY CAP: refuse to remove an implausible share (guards a parsing bug).
  if (toRemove.size > Math.max(3, Math.floor(ours.length * 0.6))) {
    console.error(`🚨 backfill abort: would remove ${toRemove.size}/${ours.length} campaigns — refusing (sanity cap).`);
    return { mapped, removed: 0, skipped };
  }
  let removed = 0;
  if (!dryRun) {
    for (const id of toRemove) { try { await setCampaignStatus(id, 'REMOVED', opts.customerId); removed++; } catch { /* keep going */ } }
  }
  return { mapped, removed: dryRun ? toRemove.size : removed, skipped };
}

/**
 * Self-healing hygiene: enforce the "don't advertise what you can't sell" rule
 * continuously, not just on a manual "Clean up" tap. Every autonomous cycle this:
 *   1. EXPIRES active listings that fail checkAdvertisable — seed/demo rows with a
 *      placeholder image (e.g. "Premium Espresso Machine"), brand/trademark items,
 *      or anything missing a real photo/supplier ref. (status 'expired', reversible)
 *   2. PAUSES any ENABLED "Arbi - " / "Arbi Video - " campaign whose product is no
 *      longer in the advertisable set — so a previously-launched ad for a junk
 *      product stops spending immediately (the inverse of the go-live gate).
 * dryRun reports without mutating.
 */
export async function enforceAdvertisable(opts: { dryRun?: boolean; customerId?: string } = {}): Promise<{ expiredListings: number; pausedCampaigns: number }> {
  const dryRun = opts.dryRun ?? false;
  const active = (await getListings('active')) as any[];

  // 1) Expire non-advertisable listings; collect the keys that REMAIN advertisable.
  const advertisableKeys = new Set<string>();
  let expiredListings = 0;
  for (const l of active) {
    if (checkAdvertisable(l).ok) {
      const k = productCampaignKey(String(l.productTitle || ''));
      if (k) advertisableKeys.add(k);
    } else {
      expiredListings++;
      if (!dryRun) { try { await updateListing(l.listingId, { status: 'expired' as any }); } catch { /* keep going */ } }
    }
  }

  // 2) Pause live campaigns whose product isn't advertisable anymore.
  const campaigns = (await listCampaigns(opts.customerId)) as any[];
  let pausedCampaigns = 0;
  const stripVideo = (n: string) => String(n || '').replace(/^Arbi Video\s*-\s*/i, '').replace(/\s*-\s*[A-Za-z]{2}\s*-\s*\d+\s*$/, '').trim();
  for (const c of campaigns) {
    const name = c.name || '';
    if (!/^Arbi (Video )?- /i.test(name)) continue;     // only our campaigns
    if (c.status !== 'ENABLED') continue;
    const key = /^Arbi Video - /i.test(name) ? productCampaignKey(stripVideo(name)) : campaignProductKey(name);
    if (key && advertisableKeys.has(key)) continue;     // still sellable — leave it serving
    pausedCampaigns++;
    if (!dryRun) { try { await setCampaignStatus(String(c.id), 'PAUSED', opts.customerId); } catch { /* keep going */ } }
  }

  return { expiredListings, pausedCampaigns };
}

/**
 * Expire duplicate active listings — keep one per normalized title (prefer the
 * one with a real image, else the newest), expire the rest. This clears the
 * duplicate products that pile up in the catalog (and that feed duplicate
 * campaigns). Reversible (status 'expired', not deleted). dryRun lists only.
 */
export async function dedupeListings(opts: { dryRun?: boolean } = {}): Promise<{ duplicates: number; expired: number }> {
  const dryRun = opts.dryRun ?? false;
  const active = (await getListings('active')) as any[];
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
  const byKey = new Map<string, any[]>();
  for (const l of active) {
    const k = norm(l.productTitle) || l.listingId;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(l);
  }
  const hasImg = (l: any) => Array.isArray(l.productImages) && l.productImages.some((i: string) => /^https?:\/\//i.test(i || ''));
  let expired = 0, duplicates = 0;
  for (const group of byKey.values()) {
    if (group.length <= 1) continue;
    // Keeper: image first, then newest (highest listedAt).
    group.sort((a, b) => (hasImg(b) ? 1 : 0) - (hasImg(a) ? 1 : 0) || (new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()));
    for (const dup of group.slice(1)) {
      duplicates++;
      if (!dryRun) { try { await updateListing(dup.listingId, { status: 'expired' as any }); expired++; } catch { /* keep going */ } }
    }
  }
  return { duplicates, expired };
}

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
  duplicateListings: number;   // duplicate catalog products found
  expiredListings: number;     // duplicate catalog products expired
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

  // Also de-duplicate the catalog (the root cause of duplicate campaigns).
  const dl = await dedupeListings({ dryRun }).catch(() => ({ duplicates: 0, expired: 0 }));

  return { dryRun, totalCampaigns: ours.length, keep, toRemove, removed, failed, duplicateListings: dl.duplicates, expiredListings: dl.expired };
}
