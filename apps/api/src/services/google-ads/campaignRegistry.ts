/**
 * Campaign registry — the exactly-once layer (directive B: duplicates are
 * structurally impossible, never detected/cleaned by the user).
 *
 * Every campaign-creation path RESERVES a slot keyed by (tenantId, listingId,
 * channel) BEFORE calling Google Ads. The reservation is an INSERT guarded by a
 * UNIQUE index, so:
 *   - the writer that wins the insert is the SOLE creator → it calls Google,
 *   - any concurrent/duplicate attempt (overlapping cycle, second Railway
 *     instance, a cycle racing a manual launch, a retry after a mid-flight API
 *     failure) hits the unique violation and is told to SKIP.
 * This replaces fragile campaign-NAME matching and the per-process cycleRunning
 * guard, which can't protect across restarts or instances.
 *
 * Persistence mirrors tenancy.ts: use the shared DatabaseManager when available,
 * fall back to an in-memory Map (single-process safety only) otherwise.
 */
import { getDatabase } from '../../config/database';

export type CampaignChannel = 'SEARCH' | 'VIDEO';
export type ReserveResult = 'won' | 'exists';

export interface CampaignSlot {
  tenantId: string;
  listingId: string;
  channel: CampaignChannel;
  googleCampaignId?: string;
  campaignName?: string;
  status: 'reserved' | 'created' | 'failed' | 'removed';
  customerId?: string;
}

let db: ReturnType<typeof getDatabase> | null = null;
try { db = getDatabase(); } catch { db = null; }

// In-memory fallback (single-process). Key = `${tenantId}|${listingId}|${channel}`.
const memory = new Map<string, CampaignSlot>();
const key = (t: string, l: string, c: CampaignChannel) => `${t}|${l}|${c}`;

/**
 * Atomically claim the (tenant, listing, channel) slot. Returns 'won' if THIS
 * caller is the sole creator (proceed to create in Google Ads), or 'exists' if
 * the slot is already reserved/created by someone else (skip — no spend).
 */
export async function reserveCampaignSlot(
  tenantId: string,
  listingId: string,
  channel: CampaignChannel,
  opts: { customerId?: string } = {}
): Promise<ReserveResult> {
  if (db) {
    try {
      // INSERT ... ON CONFLICT DO NOTHING is atomic against the unique index.
      const sql = `INSERT INTO "tenant_campaigns" ("tenantId","listingId","channel","status","customerId")
        VALUES (:tenantId, :listingId, :channel, 'reserved', :customerId)
        ON CONFLICT ("tenantId","listingId","channel") DO NOTHING
        RETURNING "id";`;
      const res: any = await (db as any).query(sql, {
        replacements: { tenantId, listingId, channel, customerId: opts.customerId || null },
      });
      // Sequelize raw INSERT...RETURNING shape: [rows, meta] or { rowCount }.
      const rows = Array.isArray(res) ? res[0] : res?.rows;
      const won = Array.isArray(rows) ? rows.length > 0 : (res?.rowCount ?? 0) > 0;
      return won ? 'won' : 'exists';
    } catch (e: any) {
      console.error('⚠️  reserveCampaignSlot DB error, using memory:', e?.message || e);
    }
  }
  const k = key(tenantId, listingId, channel);
  if (memory.has(k)) return 'exists';
  memory.set(k, { tenantId, listingId, channel, status: 'reserved', customerId: opts.customerId });
  return 'won';
}

/** Mark a reserved slot as created once Google Ads returns the campaign id. */
export async function markCampaignCreated(
  tenantId: string, listingId: string, channel: CampaignChannel,
  googleCampaignId: string, campaignName?: string
): Promise<void> {
  if (db) {
    try {
      await (db as any).query(
        `UPDATE "tenant_campaigns" SET "googleCampaignId"=:gid, "campaignName"=:name,
           "status"='created', "createdGoogleAt"=NOW(), "lastError"=NULL
         WHERE "tenantId"=:tenantId AND "listingId"=:listingId AND "channel"=:channel;`,
        { replacements: { gid: googleCampaignId, name: campaignName || null, tenantId, listingId, channel } }
      );
      return;
    } catch (e: any) { console.error('⚠️  markCampaignCreated DB error:', e?.message || e); }
  }
  const k = key(tenantId, listingId, channel);
  const s = memory.get(k);
  if (s) memory.set(k, { ...s, googleCampaignId, campaignName, status: 'created' });
}

/** Release a reservation that failed to create, so a later cycle can retry the
 *  SAME slot (never a second campaign). Keeps the row for audit. */
export async function releaseFailedReservation(
  tenantId: string, listingId: string, channel: CampaignChannel, error: string
): Promise<void> {
  if (db) {
    try {
      await (db as any).query(
        `UPDATE "tenant_campaigns" SET "status"='failed', "lastError"=:err
         WHERE "tenantId"=:tenantId AND "listingId"=:listingId AND "channel"=:channel AND "googleCampaignId" IS NULL;`,
        { replacements: { err: String(error).slice(0, 500), tenantId, listingId, channel } }
      );
      // Allow a retry: a failed, never-created reservation is deleted so the next
      // cycle can re-reserve cleanly (still exactly-once — only one row at a time).
      await (db as any).query(
        `DELETE FROM "tenant_campaigns"
         WHERE "tenantId"=:tenantId AND "listingId"=:listingId AND "channel"=:channel AND "googleCampaignId" IS NULL AND "status"='failed';`,
        { replacements: { tenantId, listingId, channel } }
      );
      return;
    } catch (e: any) { console.error('⚠️  releaseFailedReservation DB error:', e?.message || e); }
  }
  memory.delete(key(tenantId, listingId, channel));
}

export async function listSlots(tenantId: string): Promise<CampaignSlot[]> {
  if (db) {
    try {
      const r = await db.find('TenantCampaign', { where: { tenantId } } as any);
      return (r as any[]) as CampaignSlot[];
    } catch (e: any) { console.error('⚠️  listSlots DB error:', e?.message || e); }
  }
  return Array.from(memory.values()).filter((s) => s.tenantId === tenantId);
}
