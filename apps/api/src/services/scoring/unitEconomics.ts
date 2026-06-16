/**
 * Unit economics for paid-ads sourcing.
 *
 * With paid ads, every sale carries an acquisition cost (CPA). A product is only
 * worth advertising if its profit-per-unit clears that CPA — otherwise you pay
 * more for the click than you make on the sale. These pure helpers let sourcing
 * (a) RANK by realized money-after-ad-cost (the margin optimizer) and (b) GATE
 * out items that can't beat the CPA (opt-in).
 *
 * Pure + dependency-free so it's trivially testable and shared by CJ sourcing,
 * Amazon sourcing, and the advertisability gate.
 */
import type { SourcingConfig } from '../autonomousSettings';

export interface UnitEcoThresholds {
  minProfitPerUnit: number;
  minTicket: number;
  expectedCpa: number;
  profitCpaMultiple: number;
}

/** The effective per-unit profit a product must clear: the larger of the static
 *  floor and CPA × multiple (so the floor auto-tightens to the real CPA). */
export function profitFloor(t: UnitEcoThresholds): number {
  return Math.max(Number(t.minProfitPerUnit) || 0, (Number(t.expectedCpa) || 0) * (Number(t.profitCpaMultiple) || 1));
}

/** Can this product profitably run on paid ads? ticket + profit must clear floors. */
export function viableForPaidAds(ticket: number, profitPerUnit: number, t: UnitEcoThresholds): boolean {
  return (Number(ticket) || 0) >= (Number(t.minTicket) || 0) && (Number(profitPerUnit) || 0) >= profitFloor(t);
}

/** Money left per sale after one acquisition (can be negative for junk). */
export function profitAfterCpa(profitPerUnit: number, expectedCpa: number): number {
  return (Number(profitPerUnit) || 0) - (Number(expectedCpa) || 0);
}

/** Ranking key: monthly $ profit AFTER ad cost, demand-weighted. This is the
 *  margin optimizer — it favors high-demand items whose margin beats the CPA,
 *  and pushes sub-CPA trinkets to the bottom (their net is clamped to 0). */
export function cpaAdjustedEV(profitPerUnit: number, demandUnits: number, expectedCpa: number): number {
  return Math.max(0, profitAfterCpa(profitPerUnit, expectedCpa)) * Math.max(0, Number(demandUnits) || 0);
}

/** Map the runtime sourcing config → thresholds. observedCpa (when supplied and
 *  trustworthy) tightens expectedCpa, but never below the conservative estimate. */
export function thresholdsFromConfig(c: SourcingConfig, observedCpa?: number): UnitEcoThresholds {
  const obs = Number(observedCpa);
  const expectedCpa = Number.isFinite(obs) && obs > 0 ? Math.max(obs, c.targetCpa) : c.targetCpa;
  return {
    minProfitPerUnit: c.minProfitPerUnit,
    minTicket: c.minTicket,
    expectedCpa,
    profitCpaMultiple: c.profitCpaMultiple,
  };
}
