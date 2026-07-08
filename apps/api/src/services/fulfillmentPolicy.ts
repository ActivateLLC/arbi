/**
 * Fulfillment funding policy
 * ==========================
 *
 * Guarantees we never spend our own money buying a product for a customer
 * before the customer's payment is actually in hand — critical for high-ticket
 * items where Stripe's ~2-day settlement would otherwise force us to float a
 * large supplier cost.
 *
 * Decision:
 *   - supplier cost <= FULFILLMENT_FLOAT_LIMIT  -> fulfill immediately (we are
 *     willing to float a small amount so cheap items ship fast).
 *   - supplier cost  > FULFILLMENT_FLOAT_LIMIT  -> HOLD until the customer's
 *     funds for that order are `available` in our Stripe balance, then fulfill.
 *
 * Set FULFILLMENT_FLOAT_LIMIT=0 to never front a cent (everything waits for
 * settled funds).
 */

import type Stripe from 'stripe';

export type FulfillmentAction = 'fulfill_now' | 'hold_for_funds';

export interface FulfillmentDecision {
  action: FulfillmentAction;
  supplierCost: number;
  floatLimit: number;
  reason: string;
}

export function floatLimitUsd(): number {
  const v = Number(process.env.FULFILLMENT_FLOAT_LIMIT);
  return Number.isFinite(v) && v >= 0 ? v : 50; // default: float up to $50
}

/**
 * Decide whether to buy from the supplier now or wait for the customer's money.
 * Pure and deterministic.
 */
export function decideFulfillment(supplierCost: number, limit = floatLimitUsd()): FulfillmentDecision {
  const cost = Math.max(0, supplierCost || 0);
  if (cost <= limit) {
    return {
      action: 'fulfill_now',
      supplierCost: cost,
      floatLimit: limit,
      reason: `supplier cost $${cost.toFixed(2)} within float limit $${limit.toFixed(2)} — ship now`,
    };
  }
  return {
    action: 'hold_for_funds',
    supplierCost: cost,
    floatLimit: limit,
    reason: `supplier cost $${cost.toFixed(2)} exceeds float limit $${limit.toFixed(2)} — hold until customer's funds settle (no money fronted)`,
  };
}

/**
 * Are the customer's funds for this payment actually available in our Stripe
 * balance yet? Reads the charge's balance transaction (`available_on`/`status`).
 * Best-effort: returns false if it can't be determined.
 */
export async function areFundsAvailable(stripe: Stripe, paymentIntentId: string): Promise<boolean> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const charge: any = (pi as any).latest_charge;
    const txn: any = charge?.balance_transaction;
    if (!txn) return false;
    if (txn.status === 'available') return true;
    if (typeof txn.available_on === 'number') return txn.available_on * 1000 <= Date.now();
    return false;
  } catch {
    return false;
  }
}

/**
 * Sweep orders held as `awaiting_funds` and fulfill the ones whose customer
 * payment has settled. This is the automation the funding gate was missing —
 * previously only the manual POST /api/fulfillment/release-funded could release
 * them and no cron existed, so high-ticket orders parked forever. Called every
 * autonomous-engine cycle; safe no-op with no held orders / no Stripe / no DB.
 */
export async function releaseFundedOrders(): Promise<{ released: number; waiting: number }> {
  if (!process.env.STRIPE_SECRET_KEY) return { released: 0, waiting: 0 };
  try {
    const StripeMod = (await import('stripe')).default;
    const stripe = new StripeMod(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any });
    const { getDatabase } = await import('../config/database');
    const db = getDatabase();
    const orders = (await db.find('BuyerOrder', { where: { status: 'awaiting_funds' } })) as any[];
    if (!orders?.length) return { released: 0, waiting: 0 };

    let released = 0, waiting = 0;
    for (const o of orders) {
      const ok = o.paymentIntentId ? await areFundsAvailable(stripe, o.paymentIntentId) : false;
      if (!ok) { waiting++; continue; }
      await db.update('BuyerOrder', { status: 'funds_available', supplierPurchaseStatus: 'ready' }, { where: { orderId: o.orderId } });
      try {
        const { fulfillBuyerOrderViaCJ } = await import('./cjFulfillment');
        const cj = await fulfillBuyerOrderViaCJ(o.orderId);
        if (cj.attempted && !cj.success) console.warn(`   ⚠️  Funded-release CJ fulfill failed for ${o.orderId}: ${cj.reason}`);
      } catch (e: any) {
        console.error(`   ❌ Funded-release fulfill error for ${o.orderId}:`, e?.message);
      }
      released++;
    }
    return { released, waiting };
  } catch (e: any) {
    console.error('⚠️  releaseFundedOrders sweep error:', e?.message || e);
    return { released: 0, waiting: 0 };
  }
}
