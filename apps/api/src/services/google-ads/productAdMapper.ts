/**
 * Shared marketplace-listing → ProductAdData mapper, used by the campaign routes,
 * the autonomous engine, and the video-ad pipeline so the shape is identical
 * everywhere (including imageUrl, which the no-photo-no-ad rule depends on).
 */
import { ProductAdData } from './campaignAutomation';

export function listingToProductAd(l: any): ProductAdData {
  const price = Number(l.marketplacePrice) || 0;
  const profit = Number(l.estimatedProfit) || 0;
  return {
    productId: l.listingId,
    productName: l.productTitle,
    productPrice: price,
    profitMargin: price > 0 ? Math.round((profit / price) * 100) : 0,
    category: l.supplierPlatform || 'general',
    targetCountry: 'US',
    imageUrl: Array.isArray(l.productImages) ? l.productImages[0] : undefined,
    landingPageUrl: `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/product/${l.listingId}`,
  };
}
