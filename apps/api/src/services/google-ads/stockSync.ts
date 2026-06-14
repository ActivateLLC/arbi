/**
 * Stock-aware ad guard.
 *
 * Don't pay for ads on what you can't ship. This pauses the campaigns of any
 * advertised product that has gone OUT OF STOCK at its supplier, and marks the
 * listing so it stops being sold. It only checks products that actually have a
 * LIVE campaign (bounded API usage), and only pauses — it never enables.
 *
 * Stock is verified via productValidator (Rainforest for Amazon-sourced items).
 * CJ catalog items are treated as in-stock unless a check says otherwise.
 */

import { listCampaigns, setCampaignStatus } from './campaignAutomation';
import { getListings, updateListing, MarketplaceListing } from '../../routes/marketplace';
import { productValidator } from '../productValidator';

/** Does this campaign belong to this listing? (campaign name = "Arbi - <title> - ...") */
export function campaignMatchesListing(campaignName: string, productTitle: string): boolean {
  const key = (productTitle || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().slice(0, 30);
  return key.length > 3 && (campaignName || '').toLowerCase().includes(key);
}

export interface StockSyncResult {
  checked: number;
  outOfStock: number;
  paused: { campaignId: string; name: string; listingId: string }[];
}

/**
 * Pause ads for out-of-stock products. Returns what was paused.
 */
export async function syncAdsToStock(customerIdOverride?: string): Promise<StockSyncResult> {
  const campaigns = (await listCampaigns(customerIdOverride)) as any[];
  const liveEnabled = campaigns.filter((c) => c.status === 'ENABLED');
  const listings = (await getListings('active')) as MarketplaceListing[];

  const result: StockSyncResult = { checked: 0, outOfStock: 0, paused: [] };

  for (const listing of listings) {
    // Only spend a stock-check on products that are actually advertised live.
    const matched = liveEnabled.filter((c) => campaignMatchesListing(c.name, listing.productTitle));
    if (matched.length === 0) continue;

    result.checked++;
    let inStock = true;
    try {
      const v = await productValidator.validateProduct({
        ...listing,
        supplierUrl: (listing as any).supplierUrl,
        supplierPrice: String(listing.supplierPrice),
      });
      inStock = v.inStock !== false;
    } catch {
      // If we can't verify, leave it running (don't pause on a transient error).
      continue;
    }

    if (!inStock) {
      result.outOfStock++;
      for (const c of matched) {
        try {
          await setCampaignStatus(c.id, 'PAUSED', customerIdOverride);
          result.paused.push({ campaignId: c.id, name: c.name, listingId: listing.listingId });
        } catch { /* keep going */ }
      }
      // Stop selling what we can't ship.
      try { await updateListing(listing.listingId, { status: 'out_of_stock' as any }); } catch { /* noop */ }
    }
  }

  return result;
}
