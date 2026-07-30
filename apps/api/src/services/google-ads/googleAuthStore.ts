/**
 * Durable Google OAuth token store — makes "Connect YouTube" a one-tap dashboard
 * action instead of a paste-into-Railway-and-redeploy ritual.
 *
 * The OAuth callback saves the minted refresh token (which covers Google Ads +
 * YouTube) here; getAccessToken() prefers it over the env var immediately — no
 * redeploy. Stored in the engine_state table under a reserved row key, kept OUT
 * of AutonomousSettings so the /settings API can never leak it.
 */
import { getDatabase } from '../../config/database';

const AUTH_ROW = '__gauth__'; // reserved engine_state tenantId row for auth material

let db: ReturnType<typeof getDatabase> | null = null;
try { db = getDatabase(); } catch { db = null; }

let cache: { refreshToken: string; scope: string } | null = null;

/** Sync read for the request path (hydrated at boot / after connect). */
export function getStoredRefreshToken(): string | null {
  return cache?.refreshToken || null;
}

export function getStoredScope(): string {
  return cache?.scope || '';
}

/** True when the stored (or absent→false) grant includes YouTube upload. */
export function youtubeConnected(): boolean {
  return /youtube/.test(cache?.scope || '');
}

/** Persist a freshly minted refresh token + scope; effective immediately. */
export async function saveGoogleToken(refreshToken: string, scope: string): Promise<void> {
  cache = { refreshToken, scope };
  if (!db) return;
  try {
    await (db as any).query(
      `INSERT INTO "engine_state" ("tenantId","settings","updatedAt","updatedBy")
       VALUES (:tid, CAST(:s AS JSONB), NOW(), 'youtube-oauth')
       ON CONFLICT ("tenantId") DO UPDATE SET "settings"=CAST(:s AS JSONB), "updatedAt"=NOW(), "updatedBy"='youtube-oauth';`,
      { replacements: { tid: AUTH_ROW, s: JSON.stringify({ refreshToken, scope }) } }
    );
  } catch (e: any) {
    console.error('⚠️  saveGoogleToken persist failed (token active in-memory only):', e?.message || e);
  }
}

/** Load the stored token at boot so it survives redeploys. */
export async function hydrateGoogleToken(): Promise<void> {
  if (!db) return;
  try {
    const r: any = await (db as any).query(
      `SELECT "settings" FROM "engine_state" WHERE "tenantId"=:tid LIMIT 1;`,
      { replacements: { tid: AUTH_ROW } }
    );
    const rows = Array.isArray(r) ? r[0] : r?.rows;
    const s = Array.isArray(rows) && rows[0]?.settings
      ? (typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings)
      : null;
    if (s?.refreshToken) {
      cache = { refreshToken: s.refreshToken, scope: s.scope || '' };
      console.log(`✅ Google OAuth token restored from DB (youtube: ${youtubeConnected() ? 'connected' : 'not granted'})`);
    }
  } catch (e: any) {
    console.error('⚠️  hydrateGoogleToken failed (falling back to env token):', e?.message || e);
  }
}
