/**
 * Go-live eligibility gate tests — what is/ isn't allowed into the ad funnel.
 * Guards against placeholder/hardcoded rows and out-of-stock items spending money.
 */

import { isAdvertisable, checkAdvertisable, advertisableListings } from './advertisability';

const base = {
  listingId: 'l1',
  productTitle: 'Real Product',
  productImages: ['https://cdn.example-cdn.io/img.jpg'],
  supplierPrice: 10,
  marketplacePrice: 25,
  status: 'active' as const,
};

describe('advertisability gate', () => {
  it('passes a properly-sourced CJ listing (variant id + price + image)', () => {
    expect(isAdvertisable({ ...base, cjVariantId: 'vid_123', supplierUrl: 'https://cjdropshipping.com/product/-p-1.html' })).toBe(true);
  });

  it('passes an Amazon listing with a real supplier URL', () => {
    expect(isAdvertisable({ ...base, supplierUrl: 'https://www.amazon.com/dp/B0ABC' })).toBe(true);
  });

  it('rejects a placeholder example.com supplier URL with no CJ vid', () => {
    const r = checkAdvertisable({ ...base, supplierUrl: 'https://example.com/buy/B0ABC' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/supplier/i);
  });

  it('rejects protected brand/trademark products (e.g. AirPods, Nintendo Switch)', () => {
    const air = checkAdvertisable({ ...base, productTitle: 'Apple AirPods Pro 2', cjVariantId: 'vid_1', supplierUrl: 'https://cjdropshipping.com/p' });
    expect(air.ok).toBe(false);
    expect(air.reason).toMatch(/brand|trademark/i);
    expect(isAdvertisable({ ...base, productTitle: 'Nintendo Switch OLED Model White', cjVariantId: 'vid_1' })).toBe(false);
    // A generic product with no brand still passes.
    expect(isAdvertisable({ ...base, productTitle: 'Anti-Cellulite Scrunch Leggings', cjVariantId: 'vid_1' })).toBe(true);
  });

  it('rejects the hardcoded demo/seed products that keep reappearing', () => {
    for (const title of ['Premium Espresso Machine - Barista Edition 15 Bar', 'Electric Standing Desk Pro 72" - Dual Motor', '4K Smart Home Security System (8 Cameras + NVR)', 'Robot Vacuum & Mop Combo - LiDAR Navigation']) {
      expect(isAdvertisable({ ...base, productTitle: title, cjVariantId: 'vid_1' })).toBe(false);
    }
  });

  it('rejects a self-referential supplier URL (our own storefront is not a supplier)', () => {
    const r = checkAdvertisable({ ...base, productTitle: 'Generic Gadget', supplierUrl: 'https://arbi.creai.dev/product/espresso-machine-pro' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/supplier/i);
  });

  it('rejects out-of-stock listings', () => {
    expect(isAdvertisable({ ...base, cjVariantId: 'vid_1', status: 'out_of_stock' as any })).toBe(false);
  });

  it('rejects listings with no image', () => {
    expect(isAdvertisable({ ...base, cjVariantId: 'vid_1', productImages: [] })).toBe(false);
  });

  it('rejects listings with no price', () => {
    expect(isAdvertisable({ ...base, cjVariantId: 'vid_1', marketplacePrice: 0 })).toBe(false);
  });

  it('filters a mixed list down to advertisable only', () => {
    const list = [
      { ...base, cjVariantId: 'vid_1', supplierUrl: 'https://cjdropshipping.com/p1' },
      { ...base, listingId: 'l2', supplierUrl: 'https://example.com/buy/x' }, // placeholder
      { ...base, listingId: 'l3', cjVariantId: 'vid_3', status: 'out_of_stock' as any },
    ];
    const ok = advertisableListings(list as any);
    expect(ok.map((l) => l.listingId)).toEqual(['l1']);
  });
});
