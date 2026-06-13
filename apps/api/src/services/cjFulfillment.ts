/**
 * CJ fulfillment orchestration
 *
 * Bridges a paid BuyerOrder + its MarketplaceListing to the CJ Dropshipping API
 * so the supplier ships directly to the customer. Used by the checkout webhook
 * (for low-ticket, funded-now orders) and by /api/fulfillment/release-funded
 * (for high-ticket orders once the customer's funds have settled).
 *
 * No-ops cleanly (attempted:false) when CJ isn't configured or the listing has
 * no CJ variant id — callers then fall back to manual/other fulfillment.
 */

import { getDatabase } from '../config/database';
import { getListing } from '../routes/marketplace';
import { cjClient, isCJConfigured, CJShippingAddress } from './cjDropshipping';

// Minimal ISO-3166 alpha-2 -> full country name map for the markets we serve.
// CJ's createOrderV2 wants both the code and the full name. Unknown codes fall
// back to using the code as the name (CJ will validate).
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia',
  DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
  IE: 'Ireland', NZ: 'New Zealand', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', BE: 'Belgium', AT: 'Austria', CH: 'Switzerland', PT: 'Portugal',
  MX: 'Mexico', JP: 'Japan', SG: 'Singapore', AE: 'United Arab Emirates',
};

export interface CJFulfillmentOutcome {
  attempted: boolean;
  success?: boolean;
  cjOrderId?: string;
  trackingNumber?: string;
  reason?: string;
}

/**
 * Attempt to fulfill a BuyerOrder via CJ. Looks up the order + listing itself
 * so callers only need the orderId.
 */
export async function fulfillBuyerOrderViaCJ(orderId: string): Promise<CJFulfillmentOutcome> {
  if (!isCJConfigured()) return { attempted: false, reason: 'CJ not configured' };

  const db = getDatabase();
  const order: any = await db.findOne('BuyerOrder', { where: { orderId } });
  if (!order) return { attempted: false, reason: 'order not found' };

  const listing = await getListing(order.listingId);
  if (!listing?.cjVariantId) {
    return { attempted: false, reason: 'listing has no CJ variant id (not CJ-sourced)' };
  }

  const a = order.buyerShippingAddress || {};
  const countryCode = String(a.country || 'US').toUpperCase();
  const shippingAddress: CJShippingAddress = {
    name: a.name || order.buyerName || 'Customer',
    phone: a.phone,
    email: order.buyerEmail,
    country: COUNTRY_NAMES[countryCode] || countryCode,
    countryCode,
    province: a.state || a.province || '',
    city: a.city || '',
    address: a.line1 || a.address || '',
    address2: a.line2 || undefined,
    zip: a.postalCode || a.zip || '',
  };

  const result = await cjClient.fulfill({
    orderNumber: order.orderId,
    products: [{ vid: listing.cjVariantId, quantity: order.quantity || 1 }],
    shippingAddress,
  });

  if (result.success) {
    await db.update('BuyerOrder', {
      supplierOrderId: result.cjOrderId,
      supplierPurchaseStatus: result.paid ? 'completed' : 'created_unpaid',
      shipmentTrackingNumber: result.trackingNumber || null,
      shipmentCarrier: result.logisticName || null,
      status: result.paid ? 'purchasing_from_supplier' : 'supplier_order_created',
    }, { where: { orderId } });
    console.log(`   ✅ CJ order ${result.cjOrderId} created for ${orderId}${result.paid ? ' (paid)' : ' (unpaid — set CJ_AUTO_PAY=true)'}`);
  } else {
    console.error(`   ❌ CJ fulfillment failed for ${orderId}: ${result.error}`);
  }

  return {
    attempted: true,
    success: result.success,
    cjOrderId: result.cjOrderId,
    trackingNumber: result.trackingNumber,
    reason: result.error,
  };
}
