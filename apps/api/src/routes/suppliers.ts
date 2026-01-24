/**
 * Supplier Management Routes
 * Endpoints for managing multiple suppliers per product
 */

import { Router, Request, Response } from 'express';
import { supplierManager } from '../services/supplierManager';
import { fulfillmentCoordinator } from '../services/fulfillmentCoordinator';
import { stockMonitor } from '../jobs/stockMonitor';

const router = Router();

/**
 * POST /api/suppliers
 * Add a new supplier for a product
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { listingId, vendor, productUrl, price, priority } = req.body;

    if (!listingId || !vendor || !productUrl || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: listingId, vendor, productUrl, price',
      });
    }

    const supplier = await supplierManager.addSupplier({
      listingId,
      vendor,
      productUrl,
      price: parseFloat(price),
      priority: priority !== undefined ? parseInt(priority) : 0,
      isActive: true,
    });

    res.json({
      success: true,
      supplier,
      message: `Added ${vendor} as ${priority === 0 ? 'primary' : 'fallback'} supplier`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/suppliers/bulk
 * Add multiple suppliers at once
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { listingId, suppliers } = req.body;

    if (!listingId || !suppliers || !Array.isArray(suppliers)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: listingId, suppliers (array)',
      });
    }

    const created = await supplierManager.bulkAddSuppliers(listingId, suppliers);

    res.json({
      success: true,
      suppliers: created,
      count: created.length,
      message: `Added ${created.length} suppliers for listing ${listingId}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/suppliers/:listingId
 * Get all suppliers for a listing
 */
router.get('/:listingId', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;

    const suppliers = await supplierManager.getSuppliers(listingId);
    const stats = await supplierManager.getSupplierStats(listingId);

    res.json({
      success: true,
      listingId,
      suppliers,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/suppliers/:listingId/best
 * Get best available supplier for a listing
 */
router.get('/:listingId/best', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const { marketplacePrice, minProfit } = req.query;

    const price = marketplacePrice ? parseFloat(marketplacePrice as string) : 0;
    const minProfitAmount = minProfit ? parseFloat(minProfit as string) : 20;

    const result = await supplierManager.findBestSupplier(listingId, price, minProfitAmount);

    res.json({
      success: true,
      listingId,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/suppliers/:supplierId/stock
 * Update supplier stock status
 */
router.put('/:supplierId/stock', async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const { inStock, price } = req.body;

    await supplierManager.updateStockStatus(
      supplierId,
      inStock !== undefined ? Boolean(inStock) : true,
      price !== undefined ? parseFloat(price) : undefined
    );

    res.json({
      success: true,
      message: 'Stock status updated',
      supplierId,
      inStock,
      price,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/suppliers/:supplierId
 * Deactivate a supplier
 */
router.delete('/:supplierId', async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    await supplierManager.deactivateSupplier(supplierId);

    res.json({
      success: true,
      message: 'Supplier deactivated',
      supplierId,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/suppliers/:listingId/test
 * Test fulfillment for a listing (no actual purchase)
 */
router.post('/:listingId/test', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;

    const result = await fulfillmentCoordinator.testFulfillment(listingId);

    res.json({
      success: true,
      listingId,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/suppliers/monitor/start
 * Start stock monitoring
 */
router.post('/monitor/start', (req: Request, res: Response) => {
  try {
    const { schedule } = req.body;

    stockMonitor.start(schedule);

    res.json({
      success: true,
      message: 'Stock monitor started',
      status: stockMonitor.getStatus(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/suppliers/monitor/stop
 * Stop stock monitoring
 */
router.post('/monitor/stop', (req: Request, res: Response) => {
  try {
    stockMonitor.stop();

    res.json({
      success: true,
      message: 'Stock monitor stopped',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/suppliers/monitor/check
 * Run stock check manually
 */
router.post('/monitor/check', async (req: Request, res: Response) => {
  try {
    // Run check asynchronously
    stockMonitor.runCheck().catch(err => {
      console.error('Manual stock check error:', err);
    });

    res.json({
      success: true,
      message: 'Stock check started',
      status: stockMonitor.getStatus(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/suppliers/monitor/status
 * Get stock monitor status
 */
router.get('/monitor/status', (req: Request, res: Response) => {
  try {
    const status = stockMonitor.getStatus();

    res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
