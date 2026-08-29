/**
 * Shipment-tracking sweep — closes the last customer-facing gap in the
 * fulfillment chain. CJ assigns tracking numbers hours or days AFTER the order
 * is placed, so the synchronous lookup at fulfill time almost never has one;
 * without this sweep the customer would never receive a "shipped" email.
 *
 * Runs from the autonomous engine's unconditional sweep section (like
 * releaseFundedOrders): every cycle it polls CJ for orders that have a supplier
 * order id but no tracking number yet, records the tracking + carrier on the
 * order, marks it shipped, and emails the customer.
 */
import { isCJConfigured, getCjTracking } from './cjDropshipping';

const MAX_PER_SWEEP = 20; // CJ rate-limit friendly; backlog drains over cycles

export async function syncShipmentTracking(): Promise<{ checked: number; shipped: number }> {
  if (!isCJConfigured()) return { checked: 0, shipped: 0 };

  const { getDatabase } = await import('../config/database');
  const db = getDatabase();

  // Orders CJ has accepted but that have no tracking recorded yet. Terminal
  // failures ('failed') and not-yet-placed orders (no supplierOrderId) are out.
  const pending = ((await db.find('BuyerOrder', {
    where: { shipmentTrackingNumber: null },
  })) as any[]).filter(o => o.supplierOrderId && o.supplierPurchaseStatus !== 'failed');

  let shipped = 0;
  const batch = pending.slice(0, MAX_PER_SWEEP);
  for (const o of batch) {
    try {
      const t = await getCjTracking(o.supplierOrderId);
      if (!t.trackingNumber) continue;

      await db.update('BuyerOrder', {
        shipmentTrackingNumber: t.trackingNumber,
        shipmentCarrier: t.carrier || null,
        status: 'shipped',
      }, { where: { orderId: o.orderId } });
      shipped++;

      if (o.buyerEmail) {
        let productTitle = o.listingId || 'your item';
        try {
          const { getListing } = await import('../routes/marketplace');
          const listing: any = await getListing(o.listingId);
          if (listing?.productTitle) productTitle = listing.productTitle;
        } catch { /* title lookup is cosmetic */ }
        const { emailNotifier } = await import('./emailNotifier');
        await emailNotifier.sendShippingUpdate(o.buyerEmail, {
          orderId: o.orderId,
          productTitle,
          trackingNumber: t.trackingNumber,
          carrier: t.carrier,
        });
      }
    } catch { /* CJ hiccup on one order must not block the rest */ }
  }

  return { checked: batch.length, shipped };
}
