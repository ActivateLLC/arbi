/**
 * Fulfillment release
 *
 * Orders whose supplier cost exceeds the float limit are held as
 * `awaiting_funds` by the checkout webhook so we never front our own cash for a
 * high-ticket item. This endpoint releases them once the customer's payment is
 * actually available in our Stripe balance — at which point the purchase is
 * funded by the customer, not us.
 *
 * Trigger it on a schedule (e.g. hourly cron) or via Stripe's payout webhook.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getDatabase } from '../config/database';
import { areFundsAvailable } from '../services/fulfillmentPolicy';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any })
  : null;

/** GET /api/fulfillment/awaiting — list orders held for funds. */
router.get('/awaiting', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const orders = await db.find('BuyerOrder', { where: { status: 'awaiting_funds' } });
    res.json({
      success: true,
      count: orders.length,
      orders: orders.map((o: any) => ({
        orderId: o.orderId,
        listingId: o.listingId,
        amountPaid: o.amountPaid,
        createdAt: o.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fulfillment/release-funded
 * Release held orders whose customer funds are now available in Stripe.
 */
router.post('/release-funded', async (_req: Request, res: Response) => {
  if (!stripe) return res.status(500).json({ success: false, error: 'Stripe not configured' });

  try {
    const db = getDatabase();
    const orders = await db.find('BuyerOrder', { where: { status: 'awaiting_funds' } });

    const released: string[] = [];
    const stillWaiting: string[] = [];

    for (const o of orders as any[]) {
      const piId: string | undefined = o.paymentIntentId;
      const available = piId ? await areFundsAvailable(stripe, piId) : false;

      if (!available) {
        stillWaiting.push(o.orderId);
        continue;
      }

      // Customer's money is in hand — safe to fulfill (no capital fronted).
      await db.update('BuyerOrder', {
        status: 'funds_available',
        supplierPurchaseStatus: 'ready',
      }, { where: { orderId: o.orderId } });

      // Ship supplier->customer via CJ when the listing is CJ-sourced; otherwise
      // it's left 'ready' for manual fulfillment.
      const { fulfillBuyerOrderViaCJ } = await import('../services/cjFulfillment');
      const cj = await fulfillBuyerOrderViaCJ(o.orderId);
      if (cj.attempted && !cj.success) console.warn(`   CJ fulfill failed for ${o.orderId}: ${cj.reason}`);
      released.push(o.orderId);
    }

    res.json({
      success: true,
      releasedCount: released.length,
      released,
      stillWaitingCount: stillWaiting.length,
      stillWaiting,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
