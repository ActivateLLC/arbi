import Joi from 'joi';

/**
 * Validation schema for creating marketplace listing
 */
export const createListingSchema = Joi.object({
  opportunityId: Joi.string()
    .required()
    .min(3)
    .max(100)
    .description('Unique identifier for the arbitrage opportunity'),

  productTitle: Joi.string()
    .required()
    .min(3)
    .max(500)
    .description('Product title for marketplace listing'),

  productDescription: Joi.string()
    .optional()
    .max(5000)
    .description('Detailed product description'),

  productImageUrls: Joi.array()
    .items(Joi.string().uri())
    .max(20)
    .optional()
    .description('Array of image URLs to scrape/upload'),

  supplierPrice: Joi.number()
    .positive()
    .max(100000)
    .precision(2)
    .required()
    .description('Cost to purchase from supplier'),

  supplierUrl: Joi.string()
    .uri()
    .required()
    .description('Direct link to supplier product page'),

  supplierPlatform: Joi.string()
    .valid('amazon', 'walmart', 'target', 'ebay', 'aliexpress', 'other')
    .optional()
    .default('amazon')
    .description('Supplier platform name'),

  markupPercentage: Joi.number()
    .min(0)
    .max(1000)
    .default(30)
    .description('Markup percentage (e.g., 30 = 30% markup)'),
});

/**
 * Validation schema for checkout
 */
export const checkoutSchema = Joi.object({
  listingId: Joi.string()
    .required()
    .description('ID of the listing being purchased'),

  buyerEmail: Joi.string()
    .email()
    .required()
    .description('Buyer email address'),

  shippingAddress: Joi.object({
    name: Joi.string().required().min(2).max(200),
    line1: Joi.string().required().min(5).max(200),
    line2: Joi.string().optional().max(200),
    city: Joi.string().required().min(2).max(100),
    state: Joi.string().required().length(2).uppercase(), // US state codes
    postal_code: Joi.string().required().min(5).max(10),
    country: Joi.string().required().length(2).uppercase().default('US'),
  }).required(),

  paymentMethodId: Joi.string()
    .required()
    .description('Stripe payment method ID'),
});

/**
 * Validation schema for query parameters
 */
export const listingsQuerySchema = Joi.object({
  status: Joi.string()
    .valid('active', 'sold', 'expired')
    .optional()
    .default('active'),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50),

  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),

  sortBy: Joi.string()
    .valid('listedAt', 'estimatedProfit', 'marketplacePrice')
    .optional()
    .default('listedAt'),

  order: Joi.string()
    .valid('ASC', 'DESC')
    .optional()
    .default('DESC'),
});

/**
 * Helper function to validate request body against schema
 */
export function validateSchema<T>(schema: Joi.ObjectSchema<T>, data: unknown): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false, // Return all errors, not just the first one
    stripUnknown: true, // Remove unknown keys
    convert: true, // Convert types (e.g., string "123" to number 123)
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    throw {
      statusCode: 400,
      message: 'Validation failed',
      errors,
    };
  }

  return value as T;
}
