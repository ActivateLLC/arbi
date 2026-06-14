/**
 * Multi-tenant (Advertiser) API routes.
 *
 * A tenant = a subscribed customer with their own Google Ads child account
 * under the Arbi manager (MCC). These routes let you onboard a tenant (which
 * auto-provisions their ad account) and launch PAUSED campaigns into THAT
 * account, reusing the same proven REST campaign automation.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { createTenant, getTenant, listTenants, setTenantAdAccount } from '../services/tenancy';
import { provisionChildAccount, createBulkCampaigns, CampaignConfig } from '../services/google-ads/campaignAutomation';
import { getActiveProductsForAds } from './google-ads';

const router = Router();

// Conservative, new-account-safe defaults (matches the single-account quick-start).
const TENANT_CAMPAIGN_CONFIG: CampaignConfig = {
  dailyBudget: 20,
  targetROAS: 4.0,
  geoTargeting: ['US'],
  maxCPC: 1.5,
};

/** POST /api/tenants — onboard a tenant + auto-provision their ad account. */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, plan } = req.body || {};
    if (!name || !email) throw new ApiError(400, 'name and email are required');
    const tenant = await createTenant({ name, email, plan });
    res.status(201).json({ success: true, tenant });
  } catch (error: any) {
    // createTenant attaches the saved (pending) tenant when only provisioning failed.
    if (error?.tenant) {
      return res.status(202).json({
        success: false,
        message: error.message,
        tenant: error.tenant,
        hint: 'Tenant saved. Retry provisioning via POST /api/tenants/:tenantId/provision',
      });
    }
    next(error);
  }
});

/** GET /api/tenants — list all tenants. */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, tenants: await listTenants() });
  } catch (error: any) {
    next(error);
  }
});

/** GET /api/tenants/:tenantId — fetch one tenant. */
router.get('/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await getTenant(req.params.tenantId);
    if (!tenant) throw new ApiError(404, 'Tenant not found');
    res.json({ success: true, tenant });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/provision
 * Retry ad-account provisioning for a tenant whose account isn't set yet.
 */
router.post('/:tenantId/provision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await getTenant(req.params.tenantId);
    if (!tenant) throw new ApiError(404, 'Tenant not found');
    if (tenant.googleAdsCustomerId) {
      return res.json({ success: true, message: 'Already provisioned', tenant });
    }
    const { customerId, resourceName } = await provisionChildAccount({
      descriptiveName: `Arbi - ${tenant.name}`.slice(0, 60),
    });
    const updated = await setTenantAdAccount(tenant.tenantId, customerId, resourceName);
    res.json({ success: true, tenant: updated, customerId, resourceName });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Launch PAUSED campaigns for the tenant's top high-margin products into THEIR
 * ad account. Shared by the POST and the mobile-tappable GET trigger.
 */
async function launchForTenant(tenantId: string, count: number) {
  const tenant = await getTenant(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  if (!tenant.googleAdsCustomerId) {
    throw new ApiError(409, 'Tenant has no provisioned ad account yet. Provision it first.');
  }
  const products = await getActiveProductsForAds(count, 30);
  if (products.length === 0) {
    return { success: false, message: 'No products with 30%+ profit margin found.', campaigns: [] };
  }
  const result = await createBulkCampaigns(products, TENANT_CAMPAIGN_CONFIG, tenant.googleAdsCustomerId);
  return {
    success: true,
    message: `Created ${result.success} PAUSED campaign(s) in ${tenant.name}'s account`,
    tenantId,
    customerId: tenant.googleAdsCustomerId,
    created: result.success,
    failed: result.failed,
    results: result.results,
  };
}

/** POST /api/tenants/:tenantId/quick-start  Body: { count? } */
router.post('/:tenantId/quick-start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 1), 10);
    res.status(201).json(await launchForTenant(req.params.tenantId, count));
  } catch (error: any) {
    next(error);
  }
});

/** GET /api/tenants/:tenantId/quick-start-now?confirm=yes&count=N (mobile-tappable). */
router.get('/:tenantId/quick-start-now', async (req: Request, res: Response, next: NextFunction) => {
  if (req.query.confirm !== 'yes') {
    return res.status(400).json({ success: false, error: 'Add ?confirm=yes to create campaigns (they are created PAUSED).' });
  }
  try {
    const count = Math.min(Math.max(Number(req.query.count) || 5, 1), 10);
    res.status(201).json(await launchForTenant(req.params.tenantId, count));
  } catch (error: any) {
    next(error);
  }
});

export default router;
