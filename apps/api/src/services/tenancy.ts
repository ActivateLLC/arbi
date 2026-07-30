/**
 * Tenancy service — the multi-tenant layer.
 *
 * Each subscribed customer (tenant) gets their OWN Google Ads child account
 * auto-provisioned under the Arbi manager (MCC). We persist the tenant ->
 * child-account-id mapping; campaign automation is then scoped to that account
 * by passing the id through as the `customerId` override.
 *
 * Persistence mirrors the marketplace pattern: use the shared DatabaseManager
 * when available, fall back to an in-memory Map otherwise.
 */

import { getDatabase } from '../config/database';
import { provisionChildAccount } from './google-ads/campaignAutomation';

export interface Tenant {
  tenantId: string;
  name: string;
  email: string;
  googleAdsCustomerId?: string;   // bare-digit child account id (once provisioned)
  adAccountResourceName?: string; // "customers/{id}"
  plan?: string;
  status: 'pending' | 'active' | 'provision_failed' | 'suspended';
  createdAt: Date;
}

let db: ReturnType<typeof getDatabase> | null = null;
try {
  db = getDatabase();
} catch (error: any) {
  console.error('❌ Database unavailable for tenancy — using in-memory storage:', error?.message);
}

const memory: Map<string, Tenant> = new Map();

const genTenantId = () =>
  `tnt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

async function persist(tenant: Tenant): Promise<void> {
  if (db) {
    try {
      await db.create('Tenant', tenant as any);
      return;
    } catch (error: any) {
      console.error('❌ Tenant DB save failed, using memory:', error?.message);
    }
  }
  memory.set(tenant.tenantId, tenant);
}

async function patch(tenantId: string, data: Partial<Tenant>): Promise<void> {
  if (db) {
    try {
      await db.update('Tenant', data as any, { where: { tenantId } });
      return;
    } catch (error: any) {
      console.error('❌ Tenant DB update failed, using memory:', error?.message);
    }
  }
  const existing = memory.get(tenantId);
  if (existing) memory.set(tenantId, { ...existing, ...data });
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  if (db) {
    try {
      const r = await db.findOne('Tenant', { where: { tenantId } });
      if (r) return r as Tenant;
    } catch (error: any) {
      console.error('❌ Tenant DB query failed, using memory:', error?.message);
    }
  }
  return memory.get(tenantId) || null;
}

export async function listTenants(): Promise<Tenant[]> {
  if (db) {
    try {
      const r = await db.find('Tenant', { order: [['createdAt', 'DESC']] });
      return r as Tenant[];
    } catch (error: any) {
      console.error('❌ Tenant DB list failed, using memory:', error?.message);
    }
  }
  return Array.from(memory.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Attach a provisioned ad account to a tenant and mark them active.
 */
export async function setTenantAdAccount(tenantId: string, customerId: string, resourceName: string): Promise<Tenant | null> {
  await patch(tenantId, {
    googleAdsCustomerId: customerId,
    adAccountResourceName: resourceName,
    status: 'active',
  });
  return getTenant(tenantId);
}

/**
 * Create a tenant and provision their Google Ads child account under the
 * manager. The tenant row is saved first (status "pending") so we never lose
 * the signup if provisioning hiccups; on success we attach the new account id.
 */
export async function createTenant(input: { name: string; email: string; plan?: string }): Promise<Tenant> {
  const tenant: Tenant = {
    tenantId: genTenantId(),
    name: input.name,
    email: input.email,
    plan: input.plan,
    status: 'pending',
    createdAt: new Date(),
  };
  await persist(tenant);

  try {
    const { customerId, resourceName } = await provisionChildAccount({
      descriptiveName: `Arbi - ${input.name}`.slice(0, 60),
    });
    tenant.googleAdsCustomerId = customerId;
    tenant.adAccountResourceName = resourceName;
    tenant.status = 'active';
    await patch(tenant.tenantId, {
      googleAdsCustomerId: customerId,
      adAccountResourceName: resourceName,
      status: 'active',
    });
  } catch (error: any) {
    tenant.status = 'provision_failed';
    await patch(tenant.tenantId, { status: 'provision_failed' });
    // Surface provisioning detail to the caller, but the tenant row is kept so
    // it can be retried (e.g. if the account hit a creation limit).
    throw Object.assign(new Error(`Tenant created but ad-account provisioning failed: ${error?.message}`), {
      tenant,
    });
  }

  return tenant;
}
