/**
 * Multi-source product sourcing.
 *
 * Broadens the "retailer scan" beyond a single supplier: fans out to CJ and
 * Amazon (Rainforest) in parallel and merges the created listings. Each source
 * lights up when its credentials are present, and one failing source never
 * blocks the others.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { sourceTrendingFromCJ } from '../services/cjSourcing';
import { sourceTrendingFromAmazon, isAmazonSourcingConfigured } from '../services/amazonSourcing';

const router = Router();

/** GET /api/sourcing/status — which sources are live. */
router.get('/status', (_req: Request, res: Response) => {
  res.json({ cj: true, amazon: isAmazonSourcingConfigured() });
});

/** POST /api/sourcing/amazon — source high-demand products from Amazon. */
router.post('/amazon', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await sourceTrendingFromAmazon(req.body || {}));
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/sourcing/scan  Body: { keyword?, count?, markupPercentage? }
 * Scan ALL configured retailers in parallel and create listings.
 */
router.post('/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword, count, markupPercentage } = req.body || {};
    const total = Math.min(Math.max(Number(count) || 10, 2), 40);
    const per = Math.max(1, Math.floor(total / 2));

    const safe = (p: Promise<any>) => p.catch((e: any) => ({ success: false, error: e?.message || String(e), created: [] as any[] }));

    const [cj, amazon] = await Promise.all([
      safe(sourceTrendingFromCJ({ keyword, count: per, markupPercentage })),
      isAmazonSourcingConfigured()
        ? safe(sourceTrendingFromAmazon({ keyword, count: per, markupPercentage }))
        : Promise.resolve({ success: false, error: 'amazon not configured (set RAINFOREST_API_KEY)', created: [] as any[] }),
    ]);

    const created = [...(cj.created || []), ...(amazon.created || [])];
    res.json({
      success: true,
      sourced: created.length,
      sources: { cj: (cj.created || []).length, amazon: (amazon.created || []).length },
      errors: [cj.error, amazon.error].filter(Boolean),
      created,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
