/**
 * CJ product sourcing → fulfillable listings
 *
 * Pulls demand-first (Trending) products from CJ's catalog and creates
 * marketplace listings that carry a CJ variant id (vid) — so they are
 * fulfillable supplier→customer out of the box, with real CJ images and the
 * real supplier cost. Price-agnostic: no price filter is applied; the premium
 * is a flat markup and ranking happens downstream by expected value.
 */

import { cjClient, isCJConfigured } from './cjDropshipping';
import { saveListing, MarketplaceListing } from '../routes/marketplace';

export interface CJSourceOptions {
  keyword?: string;
  categoryId?: string;
  count?: number;            // how many listings to create (max 20)
  markupPercentage?: number; // premium (default 100%)
  preview?: boolean;         // if true, don't persist — just return what would be created
}

const num = (...vals: any[]): number => {
  for (const v of vals) { const n = Number(v); if (Number.isFinite(n) && n > 0) return n; }
  return 0;
};
const str = (...vals: any[]): string | undefined => {
  for (const v of vals) { if (typeof v === 'string' && v.trim()) return v.trim(); }
  return undefined;
};

export async function sourceTrendingFromCJ(opts: CJSourceOptions = {}) {
  if (!isCJConfigured()) return { success: false, error: 'CJ not configured (CJ_EMAIL + CJ_API_KEY)' };

  const count = Math.min(Math.max(opts.count || 5, 1), 20);
  const markup = opts.markupPercentage ?? 100;

  const products = await cjClient.searchProducts({
    keyword: opts.keyword,
    categoryId: opts.categoryId,
    productFlag: 0, // Trending — demand-first
    size: count * 2, // over-fetch; some may lack a usable variant
  });

  const created: any[] = [];
  const skipped: any[] = [];

  for (const p of products) {
    if (created.length >= count) break;

    const pid = str(p.pid, p.id);
    if (!pid) { skipped.push({ reason: 'no pid' }); continue; }

    let name = str(p.productNameEn, p.nameEn, p.productName);
    let image = str(p.bigImage, p.productImage, p.image);
    let price = num(p.sellPrice, p.productSellPrice);
    let vid = str(p.vid);

    // Fill missing vid/price/image/name from product detail + first variant.
    if (!vid || !price || !name || !image) {
      try {
        const d = await cjClient.getProductDetail(pid);
        name = name || str(d.productNameEn, d.productName);
        image = image || str(d.productImage, Array.isArray(d.productImageSet) ? d.productImageSet[0] : undefined);
        const variants = d.variants || d.variantList || [];
        const v = Array.isArray(variants) ? variants[0] : null;
        if (v) {
          vid = vid || str(v.vid);
          price = price || num(v.variantSellPrice, v.sellPrice);
          image = image || str(v.variantImage);
        }
        price = price || num(d.sellPrice);
      } catch { /* fall through to skip if still incomplete */ }
    }

    if (!vid || !price || !name) { skipped.push({ pid, reason: 'missing vid/price/name' }); continue; }

    const marketplacePrice = Number((price * (1 + markup / 100)).toFixed(2));
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const listing: MarketplaceListing = {
      listingId,
      opportunityId: `cj_${pid}`,
      productTitle: name.slice(0, 200),
      productDescription: `${name} — fast shipping, satisfaction guaranteed.`,
      productImages: image ? [image] : [],
      supplierPrice: Number(price.toFixed(2)),
      supplierUrl: `https://cjdropshipping.com/product/-p-${pid}.html`,
      supplierPlatform: 'cj',
      cjVariantId: vid,
      cjProductId: pid,
      marketplacePrice,
      estimatedProfit: Number((marketplacePrice - price).toFixed(2)),
      status: 'active',
      listedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    if (!opts.preview) await saveListing(listing);
    created.push({
      listingId, productTitle: listing.productTitle, supplierPrice: listing.supplierPrice,
      marketplacePrice, estimatedProfit: listing.estimatedProfit, cjVariantId: vid, preview: !!opts.preview,
    });
  }

  return {
    success: true,
    preview: !!opts.preview,
    sourced: created.length,
    created,
    skippedCount: skipped.length,
    // a raw sample helps confirm CJ field names on first live run
    sample: products[0] ? { keys: Object.keys(products[0]) } : null,
  };
}
