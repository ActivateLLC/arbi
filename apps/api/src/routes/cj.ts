/**
 * CJ Dropshipping operations (sourcing + account)
 */

import { Router, Request, Response } from 'express';
import { sourceTrendingFromCJ } from '../services/cjSourcing';
import { cjClient, isCJConfigured } from '../services/cjDropshipping';

const router = Router();

/** GET /api/cj/status — is CJ configured + balance reachable? */
router.get('/status', async (_req: Request, res: Response) => {
  if (!isCJConfigured()) return res.json({ configured: false });
  try {
    const balance = await cjClient.getBalance();
    res.json({ configured: true, balance });
  } catch (error: any) {
    res.json({ configured: true, error: error.message });
  }
});

/**
 * GET /api/cj/preview?count=3&keyword=...
 * Mobile-friendly read-only preview (creates nothing) — shows what would be
 * sourced and CJ's raw field names, so we can confirm the mapping.
 */
router.get('/preview', async (req: Request, res: Response) => {
  try {
    const result = await sourceTrendingFromCJ({
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      count: req.query.count ? Number(req.query.count) : 3,
      preview: true,
    });
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cj/source
 * Source demand-first (Trending) CJ products into fulfillable listings.
 * Body: { keyword?, categoryId?, count?, markupPercentage?, preview? }
 * Tip: run with { "preview": true } first to inspect before creating listings.
 */
router.post('/source', async (req: Request, res: Response) => {
  try {
    const result = await sourceTrendingFromCJ({
      keyword: req.body?.keyword,
      categoryId: req.body?.categoryId,
      count: req.body?.count,
      markupPercentage: req.body?.markupPercentage,
      preview: req.body?.preview === true,
    });
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
