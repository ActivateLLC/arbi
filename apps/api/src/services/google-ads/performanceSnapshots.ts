/**
 * Performance snapshots — the engine's MEMORY.
 *
 * Each cycle we record one row per campaign per UTC day: realized impressions /
 * clicks / conversions / spend / conversionValue / ROAS / CTR, joined to the
 * listing + channel via the campaign registry. This is the data the two
 * compounding loops read:
 *   - the reinvestment governor uses it for the freshness gate (don't scale spend
 *     on stale data), and
 *   - the creative-performance loop turns it into a realized score that steers
 *     what we create/launch/render next.
 *
 * ATTRIBUTION NOTE: Google Ads `conversions` / `conversionValue` are the source
 * of truth (the Arbi Purchase conversion action). There is no order→campaign
 * attribution in the schema (no gclid on buyer_orders), so we attribute at the
 * campaign level and roll up to the product via the registry mapping.
 *
 * Read-only against Google Ads (never changes spend); safe to run whenever the
 * engine is active. No-ops gracefully when there's no DB or no campaigns.
 */
import { getDatabase } from '../../config/database';
import { listCampaigns } from './campaignAutomation';
import { listSlots } from './campaignRegistry';
import { DEFAULT_TENANT_ID } from '../tenantContext';
import { getListings, updateListing } from '../../routes/marketplace';
import { realizedScoreFromSnapshots } from '../scoring/realizedPerformance';

let db: ReturnType<typeof getDatabase> | null = null;
try { db = getDatabase(); } catch { db = null; }

const round = (n: number, p = 4) => { const f = Math.pow(10, p); return Math.round((Number(n) || 0) * f) / f; };

export interface SnapshotResult { captured: number; mapped: number; unmapped: number }

/**
 * Capture today's snapshot for every campaign. Idempotent per (tenant, campaign,
 * day) via ON CONFLICT upsert, so multiple cycles/day just refresh the row.
 */
export async function captureSnapshots(tenantId: string = DEFAULT_TENANT_ID, customerIdOverride?: string): Promise<SnapshotResult> {
  if (!db) return { captured: 0, mapped: 0, unmapped: 0 };
  let campaigns: any[] = [];
  try { campaigns = (await listCampaigns(customerIdOverride)) as any[]; } catch { return { captured: 0, mapped: 0, unmapped: 0 }; }
  if (!campaigns.length) return { captured: 0, mapped: 0, unmapped: 0 };

  // Build googleCampaignId → { listingId, channel } from the registry.
  const byCampaign = new Map<string, { listingId: string; channel: string }>();
  try {
    for (const s of await listSlots(tenantId)) {
      if (s.googleCampaignId) byCampaign.set(String(s.googleCampaignId), { listingId: s.listingId, channel: s.channel });
    }
  } catch { /* unmapped is fine — still snapshot the campaign */ }

  let captured = 0, mapped = 0, unmapped = 0;
  for (const c of campaigns) {
    const link = byCampaign.get(String(c.id));
    if (link) mapped++; else unmapped++;
    const spend = Number(c.spend) || 0;
    const conv = Number(c.conversions) || 0;
    const value = Number(c.revenue) || 0; // listCampaigns maps conversionsValue → revenue
    const impressions = Number(c.impressions) || 0;
    const clicks = Number(c.clicks) || 0;
    const roas = spend > 0 ? round(value / spend) : 0;
    const ctr = impressions > 0 ? round(clicks / impressions) : 0;
    try {
      await (db as any).query(
        `INSERT INTO "campaign_performance_snapshots"
           ("id","tenantId","googleCampaignId","listingId","channel","snapshotDate",
            "impressions","clicks","conversions","spend","conversionValue","roas","ctr","capturedAt")
         VALUES (gen_random_uuid(), :tenantId, :cid, :listingId, :channel, CURRENT_DATE,
            :impressions, :clicks, :conversions, :spend, :value, :roas, :ctr, NOW())
         ON CONFLICT ("tenantId","googleCampaignId","snapshotDate") DO UPDATE SET
            "listingId"=COALESCE(EXCLUDED."listingId", "campaign_performance_snapshots"."listingId"),
            "channel"=COALESCE(EXCLUDED."channel", "campaign_performance_snapshots"."channel"),
            "impressions"=EXCLUDED."impressions", "clicks"=EXCLUDED."clicks",
            "conversions"=EXCLUDED."conversions", "spend"=EXCLUDED."spend",
            "conversionValue"=EXCLUDED."conversionValue", "roas"=EXCLUDED."roas",
            "ctr"=EXCLUDED."ctr", "capturedAt"=NOW();`,
        { replacements: {
          tenantId, cid: String(c.id), listingId: link?.listingId || null, channel: link?.channel || c.channel || null,
          impressions, clicks, conversions: conv, spend, value, roas, ctr,
        } }
      );
      captured++;
    } catch (e: any) {
      console.error('⚠️  captureSnapshots upsert error:', e?.message || e);
    }
  }
  return { captured, mapped, unmapped };
}

/** Hours since the most recent snapshot (null if none) — the governor's freshness gate. */
export async function latestSnapshotAgeHours(tenantId: string = DEFAULT_TENANT_ID): Promise<number | null> {
  if (!db) return null;
  try {
    const r: any = await (db as any).query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - MAX("capturedAt")))/3600.0 AS hrs
       FROM "campaign_performance_snapshots" WHERE "tenantId"=:tenantId;`,
      { replacements: { tenantId } }
    );
    const rows = Array.isArray(r) ? r[0] : r?.rows;
    const hrs = Array.isArray(rows) ? Number(rows[0]?.hrs) : NaN;
    return Number.isFinite(hrs) ? hrs : null;
  } catch (e: any) {
    console.error('⚠️  latestSnapshotAgeHours error:', e?.message || e);
    return null;
  }
}

/** All snapshots for a listing (for realized-score computation). */
export async function snapshotsForListing(tenantId: string, listingId: string): Promise<any[]> {
  if (!db) return [];
  try {
    const r = await db.find('CampaignPerformanceSnapshot', { where: { tenantId, listingId } } as any);
    return (r as any[]) || [];
  } catch { return []; }
}

/**
 * Compute each active listing's realized score from its snapshots and persist it.
 * Only writes listings that actually have spend (so a no-data listing keeps null
 * confidence and ranking ignores it). Best-effort, per-listing.
 */
export async function persistRealizedScores(tenantId: string = DEFAULT_TENANT_ID): Promise<{ updated: number }> {
  if (!db) return { updated: 0 };
  let updated = 0;
  let active: any[] = [];
  try { active = (await getListings('active')) as any[]; } catch { return { updated: 0 }; }
  for (const l of active) {
    try {
      const snaps = await snapshotsForListing(tenantId, l.listingId);
      if (!snaps.length) continue;
      const r = realizedScoreFromSnapshots(snaps);
      if (r.spend <= 0) continue; // no spend → don't overwrite priors with a zero-confidence score
      await updateListing(l.listingId, { realizedScore: r.score, realizedConfidence: r.confidence } as any);
      updated++;
    } catch { /* keep going */ }
  }
  return { updated };
}
