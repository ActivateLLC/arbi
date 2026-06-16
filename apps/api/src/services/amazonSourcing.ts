/**
 * Amazon product sourcing via the Rainforest API.
 *
 * Demand-first (matches the CJ sourcing philosophy): we rank by review count
 * (a proxy for sales velocity / proven demand), NOT by lowest price, then list
 * with a flat premium. Expected-value ranking happens downstream.
 *
 * Mirrors cjSourcing so both feed the same marketplace catalog.
 */

import axios from 'axios';
import { saveListing, MarketplaceListing } from '../routes/marketplace';
import { isBrandRestricted } from './google-ads/advertisability';

const RAINFOREST_URL = 'https://api.rainforestapi.com/request';

export interface AmazonSourceOptions {
  keyword?: string;
  count?: number;
  markupPercentage?: number; // premium over Amazon price (default 100%)
  minReviews?: number;       // demand floor (default 50)
  maxPrice?: number;         // skip very expensive items (default $200)
  preview?: boolean;         // don't persist, just return what we'd create
}

export function isAmazonSourcingConfigured(): boolean {
  return !!(process.env.RAINFOREST_API_KEY || '').trim();
}

/**
 * Search Amazon (via Rainforest), keep high-demand affordable products, and
 * create marketplace listings for them.
 */
export async function sourceTrendingFromAmazon(opts: AmazonSourceOptions = {}) {
  const key = (process.env.RAINFOREST_API_KEY || '').trim();
  if (!key) {
    return { success: false, source: 'amazon', error: 'RAINFOREST_API_KEY not set', sourced: 0, created: [] as any[] };
  }

  const count = Math.min(Math.max(opts.count ?? 5, 1), 20);
  const markup = opts.markupPercentage ?? 100;
  const minReviews = opts.minReviews ?? 50;
  // Cost/ticket doesn't matter — don't cap by price. High-ticket items are welcome;
  // expected-ROI ranking (demand × margin-after-CPA) sorts them, not a price ceiling.
  const maxPrice = opts.maxPrice ?? (Number(process.env.AMAZON_MAX_PRICE) || 1_000_000);
  const searchTerm = (opts.keyword || 'best sellers').trim();

  let results: any[] = [];
  try {
    const r = await axios.get(RAINFOREST_URL, {
      params: { api_key: key, type: 'search', amazon_domain: 'amazon.com', search_term: searchTerm },
      timeout: 30000,
    });
    results = r.data?.search_results || [];
  } catch (e: any) {
    const msg = e?.response?.data?.request_info?.message || e?.message || String(e);
    return { success: false, source: 'amazon', error: `Rainforest search failed: ${msg}`, sourced: 0, created: [] as any[] };
  }

  // Demand-first: real reviews + affordable + has an image, ranked by reviews.
  const candidates = results
    .filter((p) => {
      const price = Number(p?.price?.value || 0);
      const reviews = Number(p?.ratings_total || p?.reviews_total || 0);
      // Exclude trademarked/brand products — can't fulfill, Google Ads disapproves.
      return price > 0 && price <= maxPrice && reviews >= minReviews && !!p?.image && !isBrandRestricted(p?.title);
    })
    .sort((a, b) => Number(b?.ratings_total || 0) - Number(a?.ratings_total || 0))
    .slice(0, count);

  const created: any[] = [];
  for (const p of candidates) {
    const price = Number(p.price.value);
    const marketplacePrice = Number((price * (1 + markup / 100)).toFixed(2));
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const listing: MarketplaceListing = {
      listingId,
      opportunityId: `amz_${p.asin || Math.random().toString(36).slice(2, 10)}`,
      productTitle: String(p.title || 'Amazon Product').slice(0, 200),
      productDescription: `${p.title || 'Top-rated product'} — fast shipping, satisfaction guaranteed.`,
      productImages: p.image ? [p.image] : [],
      supplierPrice: Number(price.toFixed(2)),
      supplierUrl: p.link || `https://www.amazon.com/dp/${p.asin || ''}`,
      supplierPlatform: 'amazon',
      marketplacePrice,
      estimatedProfit: Number((marketplacePrice - price).toFixed(2)),
      demandScore: Number(p.ratings_total || p.reviews_total || 0), // proven demand
      status: 'active',
      listedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    if (!opts.preview) await saveListing(listing);
    created.push({
      listingId,
      productTitle: listing.productTitle,
      supplierPrice: listing.supplierPrice,
      marketplacePrice,
      estimatedProfit: listing.estimatedProfit,
      reviews: Number(p.ratings_total || 0),
      preview: !!opts.preview,
    });
  }

  return { success: true, source: 'amazon', searchTerm, sourced: created.length, created };
}
