/**
 * Tenant context — a thin resolver so the engine and persistence layers can be
 * keyed by tenant from day one (tenancy-ready) while the system runs
 * single-operator today. Single-operator always uses DEFAULT_TENANT_ID; the
 * Google Ads account falls back to the env default when a tenant has none.
 */
import { getTenant } from './tenancy';

export const DEFAULT_TENANT_ID = (process.env.TENANT_ID || 'default').trim();

/** Resolve the Google Ads customer id for a tenant (env default when unset). */
export async function resolveCustomerId(tenantId: string = DEFAULT_TENANT_ID): Promise<string | undefined> {
  try {
    const t = await getTenant(tenantId);
    if (t?.googleAdsCustomerId) return t.googleAdsCustomerId;
  } catch { /* fall through to env default */ }
  return (process.env.GOOGLE_ADS_CUSTOMER_ID || '').trim() || undefined;
}
