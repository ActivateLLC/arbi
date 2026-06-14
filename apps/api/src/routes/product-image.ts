/**
 * Product Image Resolver
 *
 * Guarantees a REAL product photo for every listing. The product page points an
 * <img> here when a listing has no usable image (or its stored image fails to
 * load). Resolution order:
 *   1. The listing's stored image, if it actually loads (HEAD check).
 *   2. A real photo scraped from the web (manufacturer / retailers / Google),
 *      uploaded to Cloudinary and persisted back onto the listing so it's only
 *      scraped once.
 *   3. As an absolute last resort, a real hosted stock photo — never an SVG or
 *      a text placeholder.
 *
 * GET /api/product-image/:listingId  -> 302 redirect to a real image URL
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getListing, updateListing } from './marketplace';
import { imageScraper } from '../services/imageScraper';

const router = Router();

// Resolve each listing's image at most once per process; redirects are cheap.
const cache = new Map<string, string>();

// Real, reliable hosted photo used only if everything else fails (never an SVG).
const FLOOR_IMAGE = 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&q=80&auto=format&fit=crop';

/** Is this a real, usable image URL (not a known-bad placeholder)? */
function isUsable(url: unknown): url is string {
  return typeof url === 'string'
    && /^https?:\/\//.test(url)
    && !url.includes('placehold.co')
    && !url.includes('source.unsplash.com')
    && !url.startsWith('data:');
}

/** Confirm a URL actually serves an image (200 + image/* content-type). */
async function loadsAsImage(url: string): Promise<boolean> {
  try {
    const res = await axios.head(url, { timeout: 6000, maxRedirects: 3, validateStatus: () => true });
    const ok = res.status >= 200 && res.status < 400;
    const type = String(res.headers['content-type'] || '');
    return ok && type.startsWith('image/');
  } catch {
    return false;
  }
}

function asinFrom(url?: string): string | undefined {
  const m = url?.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
  return m ? (m[1] || m[2]) : undefined;
}

router.get('/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  const cached = cache.get(listingId);
  if (cached) return res.redirect(302, cached);

  try {
    const listing = await getListing(listingId);
    if (!listing) return res.redirect(302, FLOOR_IMAGE);

    // 1. Stored image, if it really loads.
    const stored = Array.isArray(listing.productImages) ? listing.productImages.find(isUsable) : undefined;
    if (stored && await loadsAsImage(stored)) {
      cache.set(listingId, stored);
      return res.redirect(302, stored);
    }

    // 2. Scrape a real photo from the web.
    const scraped = await imageScraper.scrapeProductImages(listing.productTitle, asinFrom(listing.supplierUrl), 5);
    for (const img of scraped.images) {
      if (!isUsable(img.url) || !(await loadsAsImage(img.url))) continue;

      let finalUrl = img.url;
      // Re-host on Cloudinary so the image is stable and fast (best-effort).
      try {
        const uploaded = await imageScraper.uploadToCloudinary(img.url, listingId);
        if (uploaded?.secure_url) finalUrl = uploaded.secure_url;
      } catch { /* keep the scraped URL if Cloudinary upload fails */ }

      // Persist so we never scrape this listing again (best-effort).
      try { await updateListing(listingId, { productImages: [finalUrl] }); } catch { /* non-fatal */ }

      cache.set(listingId, finalUrl);
      return res.redirect(302, finalUrl);
    }

    // 3. Last resort: a real hosted photo.
    return res.redirect(302, FLOOR_IMAGE);
  } catch (err: any) {
    console.error(`product-image resolver error for ${listingId}:`, err?.message);
    return res.redirect(302, FLOOR_IMAGE);
  }
});

export default router;
