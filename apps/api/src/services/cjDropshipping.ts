/**
 * CJ Dropshipping API client (supplier → customer fulfillment)
 * ============================================================
 *
 * Replaces the fragile browser-automation fulfillment with CJ's official REST
 * API (https://developers.cjdropshipping.com, /api2.0/v1). CJ ships directly to
 * the end customer, and the order is paid from your prepaid CJ balance — so
 * there is no card-entry step for a bot to fumble.
 *
 * Fulfillment flow:
 *   getAccessToken (cached) → freightCalculate (pick a logistic) →
 *   createOrderV2 (customer address) → payBalanceV2 (from CJ balance) →
 *   trackInfo (tracking number)
 *
 * Required env:
 *   CJ_EMAIL      - your CJ account email
 *   CJ_API_KEY    - API key from CJ dashboard (Account → API)
 * Optional:
 *   CJ_AUTO_PAY=true  - also pay the order from balance (else order is created
 *                       unpaid for manual review). Defaults to false (safe).
 *   CJ_FROM_COUNTRY   - source/ship-from country code (default "CN").
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

const ENDPOINTS = {
  getAccessToken: '/authentication/getAccessToken',
  freightCalculate: '/logistic/freightCalculate',
  trackInfo: '/logistic/trackInfo',
  createOrderV2: '/shopping/order/createOrderV2',
  payBalanceV2: '/shopping/pay/payBalanceV2',
  getOrderDetail: '/shopping/order/getOrderDetail',
  getBalance: '/shopping/pay/getBalance',
  listV2: '/product/listV2',
  productQuery: '/product/query',
};

export interface CJShippingAddress {
  name: string;
  phone?: string;
  email?: string;
  country: string;       // full name, e.g. "United States"
  countryCode: string;   // 2-letter, e.g. "US"
  province: string;
  city: string;
  address: string;
  address2?: string;
  zip?: string;
}

export interface CJFulfillRequest {
  orderNumber: string;                       // our unique order id
  products: { vid?: string; sku?: string; quantity: number }[]; // CJ variant(s)
  shippingAddress: CJShippingAddress;
}

export interface CJFulfillResult {
  success: boolean;
  cjOrderId?: string;
  trackingNumber?: string;
  logisticName?: string;
  shippingCost?: number;
  paid?: boolean;
  error?: string;
}

export function isCJConfigured(): boolean {
  return !!(process.env.CJ_EMAIL && process.env.CJ_API_KEY);
}

export class CJDropshippingClient {
  private http: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 30000 });
  }

  /** Authenticate and cache the access token (CJ rate-limits this to ~1/5min). */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;

    if (!isCJConfigured()) throw new Error('CJ not configured (set CJ_EMAIL + CJ_API_KEY)');

    const { data } = await this.http.post(ENDPOINTS.getAccessToken, {
      email: process.env.CJ_EMAIL,
      password: process.env.CJ_API_KEY, // CJ uses the API key as the password
    });
    if (!data?.result || !data?.data?.accessToken) {
      throw new Error(`CJ auth failed: ${data?.message || 'unknown error'}`);
    }
    this.accessToken = data.data.accessToken as string;
    // Token is valid ~15 days; refresh well before then.
    this.tokenExpiresAt = Date.now() + 13 * 24 * 60 * 60 * 1000;
    return this.accessToken;
  }

  /** Authed request against the CJ API, returns the `data` payload. */
  private async call<T = any>(method: 'GET' | 'POST', path: string, payload?: any): Promise<T> {
    const token = await this.getAccessToken();
    const res = await this.http.request({
      method,
      url: path,
      headers: { 'CJ-Access-Token': token },
      ...(method === 'GET' ? { params: payload } : { data: payload }),
    });
    if (!res.data?.result) {
      throw new Error(`CJ ${path} failed: ${res.data?.message || 'unknown error'}`);
    }
    return res.data.data as T;
  }

  getBalance() {
    return this.call('GET', ENDPOINTS.getBalance);
  }

  /**
   * Search CJ's catalog (GET /product/listV2). Demand-first, price-agnostic:
   * default to productFlag=0 (Trending) and never apply a price filter.
   * Returns the flattened product list items.
   */
  async searchProducts(opts: { keyword?: string; categoryId?: string; productFlag?: number; page?: number; size?: number } = {}): Promise<any[]> {
    const params: Record<string, string> = {
      page: String(opts.page || 1),
      size: String(Math.min(opts.size || 20, 100)),
      startWarehouseInventory: '1', // in-stock only
      productFlag: String(opts.productFlag ?? 0), // 0 = Trending/hot
    };
    if (opts.keyword) params.keyWord = opts.keyword;
    if (opts.categoryId) params.categoryId = opts.categoryId;

    const data = await this.call<any>('GET', ENDPOINTS.listV2, params);
    // Response shape is data.content[].productList[] (with id/nameEn), but be
    // defensive about variants seen in the wild (data.list[], flat arrays).
    const out: any[] = [];
    const content = data?.content ?? data?.list ?? data ?? [];
    for (const c of (Array.isArray(content) ? content : [])) {
      if (Array.isArray(c?.productList)) out.push(...c.productList);
      else if (c && (c.pid || c.id)) out.push(c);
    }
    return out;
  }

  /** Full product detail incl. variants (GET /product/query). */
  getProductDetail(pid: string): Promise<any> {
    return this.call<any>('GET', ENDPOINTS.productQuery, { pid });
  }

  /** Cheapest available logistic for a variant to a destination. */
  async cheapestFreight(vid: string, quantity: number, countryCode: string): Promise<{ logisticName: string; price: number } | null> {
    const data = await this.call<any[]>('POST', ENDPOINTS.freightCalculate, {
      startCountryCode: process.env.CJ_FROM_COUNTRY || 'CN',
      endCountryCode: countryCode,
      products: [{ vid, quantity }],
    });
    const options = Array.isArray(data) ? data : [];
    if (options.length === 0) return null;
    const best = options.reduce((min, o) =>
      (min === null || Number(o.logisticPrice) < Number(min.logisticPrice)) ? o : min, null as any);
    return { logisticName: best.logisticName, price: Number(best.logisticPrice) };
  }

  /**
   * Fulfill an order: pick shipping, create the CJ order to the customer's
   * address, and (if CJ_AUTO_PAY) pay it from balance so CJ ships it.
   */
  async fulfill(req: CJFulfillRequest): Promise<CJFulfillResult> {
    try {
      const a = req.shippingAddress;
      const first = req.products[0];

      // 1. Shipping option (logisticName is required by createOrderV2).
      let logisticName = 'CJPacket Ordinary';
      let shippingCost: number | undefined;
      if (first?.vid) {
        const freight = await this.cheapestFreight(first.vid, first.quantity || 1, a.countryCode);
        if (freight) { logisticName = freight.logisticName; shippingCost = freight.price; }
      }

      // 2. Create the order to the customer's address.
      const order = await this.call<any>('POST', ENDPOINTS.createOrderV2, {
        orderNumber: req.orderNumber,
        shippingCustomerName: a.name,
        shippingPhone: a.phone,
        email: a.email,
        shippingCountry: a.country,
        shippingCountryCode: a.countryCode,
        shippingProvince: a.province,
        shippingCity: a.city,
        shippingAddress: a.address,
        shippingAddress2: a.address2,
        shippingZip: a.zip,
        logisticName,
        fromCountryCode: process.env.CJ_FROM_COUNTRY || 'CN',
        products: req.products.map(p => ({ vid: p.vid, sku: p.sku, quantity: p.quantity || 1 })),
      });

      const cjOrderId = order?.orderId || order?.orderNum || order?.id;
      if (!cjOrderId) return { success: false, error: 'CJ order created but no order id returned', logisticName, shippingCost };

      // 3. Optionally pay from balance (gated — safe default is create-only).
      let paid = false;
      if (process.env.CJ_AUTO_PAY === 'true') {
        await this.call('POST', ENDPOINTS.payBalanceV2, { orderIds: [cjOrderId] });
        paid = true;
      }

      // 4. Best-effort tracking lookup.
      let trackingNumber: string | undefined;
      try {
        const detail = await this.call<any>('GET', ENDPOINTS.getOrderDetail, { orderId: cjOrderId });
        trackingNumber = detail?.trackNumber || detail?.trackingNumber || undefined;
      } catch { /* tracking not available yet */ }

      return { success: true, cjOrderId, trackingNumber, logisticName, shippingCost, paid };
    } catch (error: any) {
      return { success: false, error: error?.message || 'CJ fulfillment error' };
    }
  }
}

export const cjClient = new CJDropshippingClient();
