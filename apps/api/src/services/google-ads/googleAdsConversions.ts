/**
 * Google Ads conversion tracking.
 *
 * Smart Bidding (Maximize Conversions / Target CPA / Target ROAS) can only
 * optimize if Google actually SEES purchases. This sets up a website purchase
 * conversion action and exposes its gtag "send_to" so the success page can fire
 * the conversion. Without this, the bidding runs blind.
 *
 * Flow:
 *  1. ensureConversionAction() creates (idempotently) a "Arbi Purchase" WEBPAGE
 *     conversion action on the ad account and returns its gtag send_to
 *     ("AW-<id>/<label>").
 *  2. You set GOOGLE_ADS_CONVERSION_SEND_TO to that value.
 *  3. The public landing + success pages inject gtag; the success page fires the
 *     purchase conversion with the order value + id.
 */

import { adsMutate, adsPost, digits, envCustomerId } from './googleAdsRest';

const CONVERSION_NAME = 'Arbi Purchase';

export interface ConversionActionInfo {
  resourceName: string;
  conversionActionId: string;
  sendTo: string;        // "AW-<conversionId>/<label>" for gtag
  globalTagId: string;   // "AW-<conversionId>"
}

/** Pull the gtag send_to out of a conversion action's event snippet. */
function parseSendTo(tagSnippets: any[]): string {
  for (const s of tagSnippets || []) {
    const snippet = s?.eventSnippet || '';
    const m = /send_to['"]?\s*:\s*['"]([^'"]+)['"]/.exec(snippet);
    if (m) return m[1];
  }
  return '';
}

function toInfo(row: any): ConversionActionInfo | null {
  const ca = row?.conversionAction;
  if (!ca) return null;
  const sendTo = parseSendTo(ca.tagSnippets);
  return {
    resourceName: ca.resourceName || `customers/${envCustomerId()}/conversionActions/${ca.id}`,
    conversionActionId: String(ca.id || ''),
    sendTo,
    globalTagId: sendTo ? sendTo.split('/')[0] : '',
  };
}

async function findConversionAction(name: string, customerIdOverride?: string): Promise<ConversionActionInfo | null> {
  const data = await adsPost('/googleAds:search', {
    query: `SELECT conversion_action.id, conversion_action.name, conversion_action.resource_name, conversion_action.tag_snippets, conversion_action.status FROM conversion_action WHERE conversion_action.name = '${name}' LIMIT 1`,
  }, customerIdOverride);
  const row = (data?.results || [])[0];
  return row ? toInfo(row) : null;
}

/**
 * Create the purchase conversion action if it doesn't exist, and return its tag
 * info (idempotent — safe to call repeatedly).
 */
export async function ensureConversionAction(customerIdOverride?: string): Promise<ConversionActionInfo> {
  const existing = await findConversionAction(CONVERSION_NAME, customerIdOverride);
  if (existing) return existing;

  await adsMutate('conversionActions', [{
    create: {
      name: CONVERSION_NAME,
      type: 'WEBPAGE',
      category: 'PURCHASE',
      status: 'ENABLED',
      countingType: 'ONE_PER_CLICK',
      valueSettings: { defaultValue: 0, alwaysUseDefaultValue: false, defaultCurrencyCode: 'USD' },
    },
  }], customerIdOverride);

  // Re-query to get the generated tag snippets (send_to label).
  const created = await findConversionAction(CONVERSION_NAME, customerIdOverride);
  if (!created) throw new Error('Conversion action created but could not be read back.');
  return created;
}

/** The configured gtag send_to ("AW-<id>/<label>"), or '' if not set up yet. */
export function conversionSendTo(): string {
  return (process.env.GOOGLE_ADS_CONVERSION_SEND_TO || '').trim();
}

/**
 * Global gtag <script> for ANY public page (so the gclid cookie is captured on
 * the ad-click landing page). Returns '' when conversion tracking isn't configured.
 */
export function googleAdsGlobalTagHtml(): string {
  const sendTo = conversionSendTo();
  const id = sendTo.split('/')[0]; // AW-<id>
  if (!id || !id.startsWith('AW-')) return '';
  return `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}');
    </script>`;
}

/**
 * Purchase conversion event <script> for the SUCCESS page. Reports the order
 * value + id to Google Ads so Smart Bidding learns. '' when not configured.
 */
export function googleAdsConversionEventHtml(value: number, transactionId: string): string {
  const sendTo = conversionSendTo();
  if (!sendTo || !sendTo.startsWith('AW-')) return '';
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  const safeTxn = String(transactionId || '').replace(/[^a-zA-Z0-9_\-]/g, '');
  return `
    <script>
      gtag('event', 'conversion', {
        'send_to': '${sendTo}',
        'value': ${safeValue},
        'currency': 'USD',
        'transaction_id': '${safeTxn}'
      });
    </script>`;
}
