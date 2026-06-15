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

function hasRealSupplierUrl(url?: string): boolean {
  const u = (url || '').trim();
  if (!/^https?:\/\//i.test(u)) return false;
  if (PLACEHOLDER_HOST.test(u)) return false;
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

  const hasImage = Array.isArray(listing.productImages) && listing.productImages.some((i) => (i || '').trim());
  if (!hasImage) return { ok: false, reason: 'no product image' };

  return { ok: true };
}

export function isAdvertisable(listing: Partial<MarketplaceListing>): boolean {
  return checkAdvertisable(listing).ok;
}

/** Filter a list of listings down to the advertisable ones. */
export function advertisableListings<T extends Partial<MarketplaceListing>>(listings: T[]): T[] {
  return (listings || []).filter((l) => isAdvertisable(l));
}
