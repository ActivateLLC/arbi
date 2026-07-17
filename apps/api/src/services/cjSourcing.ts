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
import { saveListing, getListings, MarketplaceListing } from '../routes/marketplace';
import { scoreExpectedValue } from '@arbi/arbitrage-engine';
import { isBrandRestricted } from './google-ads/advertisability';

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

/**
 * Turn a CJ product-detail payload into selectable variants (size/color), each
 * with its supplier variant id (vid), a human label, and price. CJ exposes the
 * label under several field names depending on the endpoint, so we try them in
 * order. Returns [] when there's only a single (unnamed) variant — the product
 * has no real choice to make.
 */
export function extractVariants(detail: any): { vid: string; label: string; price?: number }[] {
  const list = detail?.variants || detail?.variantList || detail?.variantInfoList || [];
  if (!Array.isArray(list)) return [];
  const out = list
    .map((v: any) => {
      const vid = str(v?.vid, v?.variantId);
      if (!vid) return null;
      const label = str(v?.variantKey, v?.variantNameEn, v?.variantName, v?.variantStandard, v?.variantSku)
        // CJ keys look like "Black-XL"; make it readable.
        ?.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      const price = num(v?.variantSellPrice, v?.sellPrice);
      return { vid, label: label || 'Default', price: price || undefined };
    })
    .filter(Boolean) as { vid: string; label: string; price?: number }[];
  // A lone "Default" variant isn't a real choice — treat as no variants.
  if (out.length <= 1) return [];
  return out;
}

/**
 * Pull the full product image set (for a swipeable gallery) from a CJ detail
 * payload. CJ exposes them as productImageSet[] (sometimes a comma string).
 * De-duped, http(s) only, capped at 8.
 */
export function extractImages(detail: any): string[] {
  let set: any = detail?.productImageSet ?? detail?.productImages ?? detail?.productImage;
  if (typeof set === 'string') set = set.split(',');
  if (!Array.isArray(set)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of set) {
    const u = typeof s === 'string' ? s.trim() : '';
    if (/^https?:\/\//i.test(u) && !seen.has(u)) { seen.add(u); out.push(u); }
    if (out.length >= 8) break;
  }
  return out;
}

export interface SupplierReview {
  author: string;
  country?: string;
  rating: number; // 1..5
  date?: string;
  text: string;
  images?: string[];
}

/**
 * Normalize CJ product comments into supplier reviews. CJ returns the list under
 * data.list[] (field names vary), each with a comment, score (1..5), date,
 * country flag, and optional buyer photos. Filtered to entries with real text.
 */
export function extractReviews(data: any): SupplierReview[] {
  const list = data?.list ?? data?.content ?? data?.comments ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(list)) return [];
  const out: SupplierReview[] = [];
  for (const c of list) {
    const text = str(c?.comment, c?.content, c?.commentContent);
    if (!text) continue;
    const rating = Math.max(1, Math.min(5, Math.round(num(c?.score, c?.commentScore, c?.star) || 5)));
    const imgsRaw = c?.commentUrls ?? c?.commentImages ?? c?.images;
    const images = (typeof imgsRaw === 'string' ? imgsRaw.split(',') : Array.isArray(imgsRaw) ? imgsRaw : [])
      .map((s: any) => (typeof s === 'string' ? s.trim() : '')).filter((u: string) => /^https?:\/\//i.test(u)).slice(0, 3);
    out.push({
      author: str(c?.commentUser, c?.userName, c?.buyerName) || 'Verified Buyer',
      country: str(c?.countryCode, c?.country),
      rating,
      date: str(c?.commentDate, c?.createTime, c?.date),
      text: text.slice(0, 500),
      images: images.length ? images : undefined,
    });
    if (out.length >= 12) break;
  }
  return out;
}

export async function sourceTrendingFromCJ(opts: CJSourceOptions = {}) {
  if (!isCJConfigured()) return { success: false, error: 'CJ not configured (CJ_EMAIL + CJ_API_KEY)' };

  const count = Math.min(Math.max(opts.count || 5, 1), 20);
  const markup = opts.markupPercentage ?? 100;

  // Over-fetch a real pool so selection is by expected value, not by whatever
  // CJ returns first (which trends cheap). Ordered by listed-count (demand), not price.
  const pool = await cjClient.searchProducts({
    keyword: opts.keyword,
    categoryId: opts.categoryId,
    // Trending only for generic discovery; a keyword/category searches the full
    // catalog (otherwise Trending ∩ keyword returns almost nothing).
    productFlag: (opts.keyword || opts.categoryId) ? undefined : 0,
    size: Math.min(Math.max(count * 4, 20), 100),
  });

  // Rank price-agnostically by expected value (demand × premium). listedNum is
  // the demand proxy; profit-per-unit scales with the product's own price, so a
  // higher-priced high-demand item can outrank a cheap one — no price bias.
  const ranked = pool
    .map((p) => {
      const price = num(p.sellPrice, p.nowPrice);
      const marketplacePrice = price * (1 + markup / 100);
      const marginPercent = marketplacePrice > 0 ? ((marketplacePrice - price) / marketplacePrice) * 100 : 0;
      const ev = scoreExpectedValue({
        profitPerUnit: marketplacePrice - price,
        marginPercent,
        monthlySalesProxy: num(p.listedNum, p.listedCount, p.listedNum),
        trending: true,
      });
      return { p, score: ev.lucrativeScore, expectedMonthlyProfit: ev.expectedMonthlyProfit };
    })
    .filter((x) => num(x.p.sellPrice, x.p.nowPrice) > 0)
    .sort((a, b) => b.score - a.score);

  const created: any[] = [];
  const skipped: any[] = [];

  // De-dupe against the existing catalog so we never re-add a product that's
  // already listed (CJ Trending returns the same items every cycle → this was
  // the source of the duplicate listings + duplicate campaigns).
  const existing = await getListings('active').catch(() => [] as MarketplaceListing[]);
  const existingPids = new Set(existing.map((l) => String(l.opportunityId || '')));
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
  const existingTitles = new Set(existing.map((l) => norm(l.productTitle)));

  for (const { p } of ranked) {
    if (created.length >= count) break;

    const pid = str(p.pid, p.id);
    if (!pid) { skipped.push({ reason: 'no pid' }); continue; }
    if (existingPids.has(`cj_${pid}`)) { skipped.push({ pid, reason: 'already in catalog' }); continue; }

    let name = str(p.productNameEn, p.nameEn, p.productName);
    let image = str(p.bigImage, p.productImage, p.image);
    let price = num(p.sellPrice, p.productSellPrice);
    let vid = str(p.vid);
    let variants: { vid: string; label: string; price?: number }[] = [];
    let images: string[] = image ? [image] : [];

    // Fetch detail for vid/price/name AND for the full image set + variants
    // (the catalog list only carries one image). Pace it to avoid CJ rate-limits.
    if (!vid || !price || !name || !image || images.length <= 1) {
      try {
        await new Promise(r => setTimeout(r, 600));
        const d = await cjClient.getProductDetail(pid);
        name = name || str(d.productNameEn, d.productName);
        image = image || str(d.productImage, Array.isArray(d.productImageSet) ? d.productImageSet[0] : undefined);
        const detailImages = extractImages(d);
        if (detailImages.length) images = detailImages; // full gallery
        variants = extractVariants(d); // size/color choices, if any
        const detailVariants = d.variants || d.variantList || [];
        const v = Array.isArray(detailVariants) ? detailVariants[0] : null;
        if (v) {
          vid = vid || str(v.vid);
          price = price || num(v.variantSellPrice, v.sellPrice);
          image = image || str(v.variantImage);
        }
        price = price || num(d.sellPrice);
      } catch { /* fall through to skip if still incomplete */ }
    }

    if (!vid || !price || !name) { skipped.push({ pid, reason: 'missing vid/price/name' }); continue; }
    // Same product under a different pid → skip (title-level de-dupe).
    if (existingTitles.has(norm(name))) { skipped.push({ pid, reason: 'duplicate title' }); continue; }
    // Never source trademarked/brand products — we can't fulfill them and Google
    // Ads disapproves them. Keeps the catalog clean at the source.
    if (isBrandRestricted(name)) { skipped.push({ pid, reason: 'brand/trademark' }); continue; }

    const marketplacePrice = Number((price * (1 + markup / 100)).toFixed(2));
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const listing: MarketplaceListing = {
      listingId,
      opportunityId: `cj_${pid}`,
      productTitle: name.slice(0, 200),
      productDescription: `${name} — fast shipping, satisfaction guaranteed.`,
      productImages: images.length ? images : (image ? [image] : []),
      supplierPrice: Number(price.toFixed(2)),
      supplierUrl: `https://cjdropshipping.com/product/-p-${pid}.html`,
      supplierPlatform: 'cj',
      cjVariantId: vid,
      cjProductId: pid,
      variants: variants.length ? variants : undefined,
      marketplacePrice,
      estimatedProfit: Number((marketplacePrice - price).toFixed(2)),
      demandScore: num(p.listedNum, p.listedCount), // proven demand (CJ listed count)
      status: 'active',
      listedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    if (!opts.preview) await saveListing(listing);
    // Track within this run so two trending entries for the same item don't both list.
    existingPids.add(`cj_${pid}`);
    existingTitles.add(norm(name));
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
    poolSize: pool.length,
    // a raw sample helps confirm CJ field names on first live run
    sample: pool[0] ? { keys: Object.keys(pool[0]) } : null,
  };
}
