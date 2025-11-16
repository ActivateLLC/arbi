import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

/**
 * Test Cloudinary API
 */
router.get('/test/cloudinary', async (req: Request, res: Response) => {
  try {
    let cloudName: string | undefined;
    let apiKey: string | undefined;
    let apiSecret: string | undefined;

    // Support both CLOUDINARY_URL and individual env vars
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if (cloudinaryUrl) {
      // Parse cloudinary://api_key:api_secret@cloud_name
      const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
      if (match) {
        apiKey = match[1];
        apiSecret = match[2];
        cloudName = match[3];
      }
    } else {
      // Fall back to individual variables
      cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      apiKey = process.env.CLOUDINARY_API_KEY;
      apiSecret = process.env.CLOUDINARY_API_SECRET;
    }

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        success: false,
        error: 'Cloudinary credentials not configured',
        env: {
          cloudinaryUrl: !!cloudinaryUrl,
          cloudName: !!cloudName,
          apiKey: !!apiKey,
          apiSecret: !!apiSecret
        }
      });
    }

    // Test image upload from URL
    const testImageUrl = 'https://i.ebayimg.com/images/g/dT0AAOSwmfhh8qZo/s-l1600.jpg';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const timestamp = Math.round(Date.now() / 1000);
    const crypto = require('crypto');

    // Create signature
    const signatureString = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', testImageUrl);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const uploadResponse = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    res.json({
      success: true,
      message: 'Cloudinary API working!',
      test: {
        uploaded: true,
        publicId: uploadResponse.data.public_id,
        url: uploadResponse.data.secure_url,
        format: uploadResponse.data.format,
        size: `${(uploadResponse.data.bytes / 1024).toFixed(2)} KB`
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Cloudinary test failed',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Test Rainforest API
 */
router.get('/test/rainforest', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.RAINFOREST_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Rainforest API key not configured'
      });
    }

    // Test Amazon search
    const response = await axios.get('https://api.rainforestapi.com/request', {
      params: {
        api_key: apiKey,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: 'Nintendo Switch',
        max_page: 1
      },
      timeout: 30000
    });

    if (response.data && response.data.search_results) {
      const firstResult = response.data.search_results[0] || {};

      res.json({
        success: true,
        message: 'Rainforest API working!',
        test: {
          found: response.data.search_results.length,
          sample: {
            title: firstResult.title,
            price: firstResult.price?.value,
            rating: firstResult.rating,
            asin: firstResult.asin
          },
          credits: response.data.request_info?.credits_used || 1
        }
      });
    } else {
      res.json({
        success: false,
        error: 'No results from Rainforest API'
      });
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Rainforest test failed',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Test all APIs at once
 */
router.get('/test/all', async (req: Request, res: Response) => {
  const results: any = {
    cloudinary: { configured: false, working: false },
    rainforest: { configured: false, working: false },
    ebay: { configured: false, working: false }
  };

  // Check Cloudinary (supports both CLOUDINARY_URL and individual vars)
  results.cloudinary.configured = !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY &&
     process.env.CLOUDINARY_API_SECRET)
  );

  // Check Rainforest
  results.rainforest.configured = !!process.env.RAINFOREST_API_KEY;

  // Check eBay
  results.ebay.configured = !!(
    process.env.EBAY_APP_ID &&
    process.env.EBAY_CERT_ID &&
    process.env.EBAY_DEV_ID
  );

  res.json({
    success: true,
    apis: results,
    ready: results.cloudinary.configured && results.rainforest.configured,
    needsEbay: !results.ebay.configured
  });
});

export default router;
