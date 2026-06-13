/**
 * Cleanup Placeholder Images
 * Removes placeholder images from database, keeps only real Cloudinary images
 */

import { Router, Request, Response } from 'express';
import { getListing, updateListing } from './marketplace';

const router = Router();

/**
 * POST /api/cleanup-placeholders/:listingId
 * Remove all placeholder images, keep only Cloudinary
 */
router.post('/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  try {
    const listing = await getListing(listingId);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    const productImages = listing.productImages || [];
    const before = productImages.length;

    // Filter to only Cloudinary images
    const realImages = productImages.filter((img: string) =>
      img && typeof img === 'string' && img.includes('cloudinary.com')
    );

    const after = realImages.length;
    const removed = before - after;

    // Update listing
    await updateListing(listingId, {
      productImages: realImages,
    });

    console.log(`✅ Cleaned up ${listingId}: removed ${removed} placeholders, kept ${after} real images`);

    res.json({
      success: true,
      listingId,
      before,
      after,
      removed,
      images: realImages,
    });

  } catch (error: any) {
    console.error('❌ Error cleaning placeholders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
