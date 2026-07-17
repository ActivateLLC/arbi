/**
 * Shared Google Ads REST core (v23).
 *
 * One place for OAuth, headers, the mutate/search/method helpers, customer-id
 * resolution, and error decoding — used by both the Search campaign automation
 * and the Performance Max visual engine. REST (not gRPC) because the gRPC
 * client's channel establishment hangs from our Railway container.
 *
 * Multi-tenant: login-customer-id is ALWAYS the manager (from env); only the
 * customer-id in the URL path varies per tenant child account.
 */

import axios from 'axios';

export const API_VERSION = 'v23';
export const ADS_BASE = `https://googleads.googleapis.com/${API_VERSION}`;
export const REQUEST_TIMEOUT_MS = 30000;

export const trimEnv = (k: string) => (process.env[k] || '').trim();
export const digits = (s: string) => (s || '').replace(/-/g, '');
export function envCustomerId(): string { return digits(trimEnv('GOOGLE_ADS_CUSTOMER_ID')); }
export function managerId(): string { return digits(trimEnv('GOOGLE_ADS_LOGIN_CUSTOMER_ID')); }

let _token: { value: string; expiresAt: number } | null = null;
export async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt) return _token.value;
  const body = new URLSearchParams({
    client_id: trimEnv('GOOGLE_ADS_CLIENT_ID'),
    client_secret: trimEnv('GOOGLE_ADS_CLIENT_SECRET'),
    refresh_token: trimEnv('GOOGLE_ADS_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  }).toString();
  const r = await axios.post('https://oauth2.googleapis.com/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  const ttlMs = (Number(r.data.expires_in) || 3600) * 1000;
  _token = { value: r.data.access_token, expiresAt: Date.now() + ttlMs - 60000 };
  return _token.value;
}

export async function adsHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await getAccessToken()}`,
    'developer-token': trimEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'Content-Type': 'application/json',
  };
  const mgr = managerId();
  if (mgr) headers['login-customer-id'] = mgr;
  return headers;
}

/** POST a {resource}:mutate and return created resource names. */
export async function adsMutate(resource: string, operations: any[], customerIdOverride?: string): Promise<string[]> {
  const cid = digits(customerIdOverride || '') || envCustomerId();
  const url = `${ADS_BASE}/customers/${cid}/${resource}:mutate`;
  try {
    const r = await axios.post(url, { operations }, { headers: await adsHeaders(), timeout: REQUEST_TIMEOUT_MS });
    return (r.data?.results || []).map((x: any) => x.resourceName as string);
  } catch (e: any) {
    throw new Error(describeAdsError(e));
  }
}

/**
 * POST a custom method/endpoint under a customer (e.g. ":createCustomerClient",
 * "/googleAds:search"). `suffix` is appended after /customers/{cid}.
 */
export async function adsPost(suffix: string, body: any, customerIdOverride?: string): Promise<any> {
  const cid = digits(customerIdOverride || '') || envCustomerId();
  const url = `${ADS_BASE}/customers/${cid}${suffix}`;
  try {
    const r = await axios.post(url, body, { headers: await adsHeaders(), timeout: REQUEST_TIMEOUT_MS });
    return r.data;
  } catch (e: any) {
    throw new Error(describeAdsError(e));
  }
}

/** Download a remote image and return standard base64 (for imageAsset.data). */
export async function downloadAsBase64(url: string): Promise<string> {
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: REQUEST_TIMEOUT_MS });
  return Buffer.from(r.data).toString('base64');
}

/**
 * Decode a Google Ads REST error into a readable message, surfacing each
 * error's code and the field path that failed (location.fieldPathElements).
 */
export function describeAdsError(error: any): string {
  try {
    const gerr = error?.response?.data?.error;
    if (gerr?.details?.length) {
      const parts: string[] = [];
      for (const d of gerr.details) {
        if (Array.isArray(d.errors)) {
          for (const er of d.errors) {
            const code = er.errorCode
              ? Object.entries(er.errorCode).map(([k, v]) => `${k}=${v}`).join(',')
              : '';
            const path = Array.isArray(er?.location?.fieldPathElements)
              ? er.location.fieldPathElements
                  .map((fp: any) => (fp.index !== undefined && fp.index !== null ? `${fp.fieldName}[${fp.index}]` : fp.fieldName))
                  .join('.')
              : '';
            parts.push([er.message, code, path && `@ ${path}`].filter(Boolean).join(' '));
          }
        }
      }
      if (parts.length) return parts.join(' | ');
    }
    if (gerr?.message) return gerr.message;
    if (error?.code === 'ECONNABORTED') return `request timed out after ${REQUEST_TIMEOUT_MS}ms (${error?.config?.url || ''})`;
  } catch { /* fall through */ }
  if (error?.message) return error.message;
  try { return JSON.stringify(error).slice(0, 600); } catch { return String(error); }
}
