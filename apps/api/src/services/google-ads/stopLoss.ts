/**
 * Net-P&L STOP-LOSS — the hard "can't blow the account" circuit breaker.
 *
 * You can't run paid ads with zero risk (you pay to learn), but you CAN bound the
 * loss: if cumulative ad spend exceeds cumulative profit by more than a limit you
 * set, HALT all spend immediately — pause every live campaign and turn Auto
 * Go-Live OFF (durably). The worst case becomes a small, fixed, known number.
 *
 * Reuses Google Ads spend (listCampaigns) + realized profit (buyer_orders). Safe
 * to call every cycle; no-ops if it can't read the numbers (fails toward halting
 * is not done here — only a CONFIRMED breach halts, so a transient read error
 * never pauses a working account; the per-campaign optimizer still guards spend).
 */
import { listCampaigns, setCampaignStatus } from './campaignAutomation';
import { getOrders } from '../../routes/marketplace';
import { getAutonomousSettings, setAutonomousSettings } from '../autonomousSettings';

/** Pure decision: is the account past its stop-loss? */
export function stopLossBreached(spend: number, profit: number, limit: number): boolean {
  return (Number(profit) || 0) - (Number(spend) || 0) < -Math.abs(Number(limit) || 0);
}

export interface StopLossResult { triggered: boolean; spend: number; profit: number; net: number; limit: number; paused: number }

export async function checkStopLoss(customerIdOverride?: string): Promise<StopLossResult> {
  const limit = getAutonomousSettings().governor?.stopLossUsd ?? 50;
  let campaigns: any[] = [];
  try { campaigns = (await listCampaigns(customerIdOverride)) as any[]; } catch { return { triggered: false, spend: 0, profit: 0, net: 0, limit, paused: 0 }; }
  const spend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);

  let profit = 0;
  try {
    const orders = (await getOrders()) as any[];
    profit = orders.reduce((s, o) => s + (o?.status !== 'refunded' ? Math.max(0, Number(o.actualProfit) || 0) : 0), 0);
  } catch { /* profit stays 0 — conservative */ }

  const net = Math.round((profit - spend) * 100) / 100;
  if (!stopLossBreached(spend, profit, limit)) return { triggered: false, spend, profit, net, limit, paused: 0 };

  // BREACH → halt: pause every live campaign + turn Auto Go-Live off (durably).
  let paused = 0;
  for (const c of campaigns) {
    if (c.status === 'ENABLED') {
      try { await setCampaignStatus(String(c.id), 'PAUSED', customerIdOverride); paused++; } catch { /* keep going */ }
    }
  }
  try { setAutonomousSettings({ autoGoLive: false }, 'stop-loss'); } catch { /* non-fatal */ }
  return { triggered: true, spend, profit, net, limit, paused };
}
