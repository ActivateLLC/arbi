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
