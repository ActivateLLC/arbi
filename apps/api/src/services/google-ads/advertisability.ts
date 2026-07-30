/**
 * Go-live eligibility gate — "don't advertise what you can't sell."
 *
 * Before a product is allowed to create a campaign or go LIVE (real spend), it
 * must be properly sourced and in stock. This is a cheap, synchronous pre-check
 * on the listing itself (no API calls); the stock-sync guard (stockSync.ts) is
 * the continuous, supplier-verified backstop that pauses ads if an item later
 * goes out of stock.
 *
 * A listing is advertisable only if ALL hold:
 *  - status is 'active' (not sold / expired / out_of_stock)
 *  - it has a REAL supplier reference: a CJ variant id (fulfillable) OR a real
 *    http(s) supplier URL that isn't a placeholder (example.com / localhost)
 *  - it has a positive marketplace price and supplier cost
 *  - it has at least one product image (no blank landing page / blank ad)
 *
 * This is what blocks leftover/hardcoded demo rows (placeholder URLs, no vid)
 * from ever entering the ad funnel.
 */

import type { MarketplaceListing } from '../../routes/marketplace';

const PLACEHOLDER_HOST = /(^|\/\/)(www\.)?(example\.(com|org|net)|localhost|test\.|placeholder)/i;

/**
 * Protected brands / trademarked products we must NOT advertise on a dropshipping
 * store: they can't be legally/genuinely sourced via CJ, Google Ads routinely
 * disapproves them (counterfeit/trademark policy), and we can't fulfill them.
 * This is what stops leftover demo rows like "Apple AirPods Pro 2" or "Nintendo
 * Switch OLED" from ever going live, regardless of how they got into the catalog.
 */
const BRAND_DENYLIST: RegExp[] = [
  /\bapple\b/i, /\bairpods?\b/i, /\biphones?\b/i, /\bipads?\b/i, /\bmacbooks?\b/i, /\bairtags?\b/i,
  /\bnintendo\b/i, /\bnintendo switch\b/i, /\bplaystation\b/i, /\bps[45]\b/i, /\bxbox\b/i,
  /\bsamsung\b/i, /\bgalaxy\b/i, /\bgoogle pixel\b/i,
  /\bsony\b/i, /\bbose\b/i, /\bbeats\b/i, /\bjbl\b/i, /\bsonos\b/i,
  /\bdyson\b/i, /\bkitchenaid\b/i, /\bninja\b/i, /\bkeurig\b/i, /\binstant pot\b/i,
  /\blego\b/i, /\bgopro\b/i, /\bdji\b/i, /\bfitbit\b/i, /\bgarmin\b/i,
  /\bnike\b/i, /\badidas\b/i, /\bgucci\b/i, /\blouis vuitton\b/i, /\bchanel\b/i, /\brolex\b/i,
  /\bdisney\b/i, /\bpok[eé]mon\b/i, /\bmarvel\b/i, /\bstar wars\b/i,
  /\byeti\b/i, /\blululemon\b/i, /\bstanley\b/i,
  /\byamaha\b/i, /\bcasio\b/i, /\broland\b/i, /\bfender\b/i, /\bgibson\b/i, /\bkorg\b/i, // instruments
  /\bbreville\b/i, /\birobot\b/i, /\broomba\b/i, /\bcanon\b/i, /\bnikon\b/i,             // appliances/cameras
  /\bmeta quest\b/i, /\boculus\b/i, /\bkindle\b/i, /\blogitech\b/i, /\banker\b/i,        // devices
  /\bring (video )?doorbell\b/i, /\bgalaxy buds\b/i, /\bmacbook\b/i, /\bipad\b/i, /\biphone\b/i,
  /\bray-?ban\b/i, /\binstant vortex\b/i, /\binstant pot\b/i, /\bvitamix\b/i, /\bcricut\b/i,
  // Internal test/QA junk that was seeded into the catalog.
  /^test\s*-/i, /google ads (integration|token verification)/i, /token verification/i,
  // Hardcoded demo/seed products (repo campaign-assets / mock arrays) that keep
  // reappearing — no real CJ supplier, can't be fulfilled, must never advertise.
  /electric standing desk pro/i, /4k smart home security/i, /premium espresso machine/i,
  /barista edition/i, /robot vacuum.*lidar/i, /herman miller/i, /ergonomic office chair/i,
  /security system.*\d+\s*cam/i,
];

const RESOLVER_OR_PLACEHOLDER = /\/(api\/)?product-image\/|example\.(com|org|net)|placeholder|via\.placeholder|dummyimage/i;

/** True when a product title references a protected brand we can't advertise. */
export function isBrandRestricted(title?: string): boolean {
  const t = (title || '').toLowerCase();
  return BRAND_DENYLIST.some((re) => re.test(t));
}

function hasRealSupplierUrl(url?: string): boolean {
  const u = (url || '').trim();
  if (!/^https?:\/\//i.test(u)) return false;
  if (PLACEHOLDER_HOST.test(u)) return false;
  // A supplier URL pointing at our OWN storefront isn't a real supplier — these
  // are seed/demo rows (e.g. arbi.creai.dev/product/espresso-machine-pro). You
  // can't dropship from yourself, so this is a placeholder, not a real source.
  if (/creai\.dev/i.test(u)) return false;
  return true;
}

export interface AdvertisabilityResult {
  ok: boolean;
  reason?: string;
}

export function checkAdvertisable(listing: Partial<MarketplaceListing>): AdvertisabilityResult {
  if (!listing) return { ok: false, reason: 'no listing' };
  if (listing.status && listing.status !== 'active') {
    return { ok: false, reason: `status=${listing.status}` };
  }
  if (isBrandRestricted(listing.productTitle)) {
    return { ok: false, reason: 'brand/trademark — cannot legitimately source or advertise' };
  }

  const price = Number(listing.marketplacePrice) || 0;
  const cost = Number(listing.supplierPrice) || 0;
  if (price <= 0) return { ok: false, reason: 'no marketplace price' };
  if (cost <= 0) return { ok: false, reason: 'no supplier cost' };

  // Real supplier reference: a CJ variant id is the strongest signal (fully
  // fulfillable); otherwise require a real, non-placeholder supplier URL.
  const hasCjVid = !!(listing.cjVariantId && String(listing.cjVariantId).trim());
  if (!hasCjVid && !hasRealSupplierUrl(listing.supplierUrl)) {
    return { ok: false, reason: 'no real supplier reference (cjVariantId or supplierUrl)' };
  }

  // Require a REAL product photo — not empty, not the placeholder/resolver path.
  // No photo means a placeholder landing page and no creative for video ads.
  const hasImage = Array.isArray(listing.productImages)
    && listing.productImages.some((i) => /^https?:\/\//i.test((i || '').trim()) && !RESOLVER_OR_PLACEHOLDER.test(i));
  if (!hasImage) return { ok: false, reason: 'no real product image' };

  return { ok: true };
}

export function isAdvertisable(listing: Partial<MarketplaceListing>): boolean {
  return checkAdvertisable(listing).ok;
}

/** Filter a list of listings down to the advertisable ones. */
export function advertisableListings<T extends Partial<MarketplaceListing>>(listings: T[]): T[] {
  return (listings || []).filter((l) => isAdvertisable(l));
}
