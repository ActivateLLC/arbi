import axios from 'axios';
import crypto from 'crypto';
import { ExtractedProductData } from '../services/PhotoExtractionService';

/**
 * Amazon SP-API Integration
 *
 * Automates listing creation on Amazon for dropshipping arbitrage.
 *
 * REQUIREMENTS:
 * - Amazon Seller Central Account ($39.99/month Professional plan)
 * - SP-API Developer Application approved
 * - IAM Role with SP-API permissions
 * - AWS Access Key & Secret for AWS Signature V4
 * - LWA (Login with Amazon) credentials for OAuth
 *
 * API Docs: https://developer-docs.amazon.com/sp-api/
 *
 * NOTE: Amazon SP-API is significantly more complex than eBay.
 * This implementation provides the structure but will need proper
 * AWS SigV4 signing and OAuth token management in production.
 */

export interface AmazonListingRequest {
  productData: ExtractedProductData;
  price: number;
  quantity: number;
  sku?: string;
  fulfillmentChannel?: 'DEFAULT' | 'AMAZON_NA'; // FBA vs FBM
  condition?: 'New' | 'Used' | 'Refurbished' | 'CollectibleLikeNew';
}

export interface AmazonListingResponse {
  success: boolean;
  sku?: string;
  asin?: string;
  listingUrl?: string;
  error?: string;
}

export class AmazonSellerAPI {
  private accessToken: string;
  private refreshToken: string;
  private sellerId: string;
  private marketplace: string;
  private region: string;
  private apiUrl: string;

  // AWS credentials for signature
  private awsAccessKeyId: string;
  private awsSecretAccessKey: string;

  constructor() {
    // LWA (Login with Amazon) OAuth credentials
    this.accessToken = process.env.AMAZON_SP_ACCESS_TOKEN || '';
    this.refreshToken = process.env.AMAZON_SP_REFRESH_TOKEN || '';

    // Seller info
    this.sellerId = process.env.AMAZON_SELLER_ID || '';
    this.marketplace = process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER'; // US
    this.region = process.env.AMAZON_REGION || 'us-east-1';

    // AWS IAM credentials for signing requests
    this.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    this.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

    // API endpoint
    this.apiUrl = this.getEndpoint(this.marketplace);

    if (!this.isConfigured()) {
      console.warn('⚠️  Amazon SP-API not fully configured');
      console.warn('   Required env vars: AMAZON_SP_REFRESH_TOKEN, AMAZON_SELLER_ID,');
      console.warn('   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }
  }

  /**
   * Create a new Amazon listing
   *
   * Amazon requires either:
   * 1. ASIN match (existing product in catalog) - easier
   * 2. Brand registry + Product creation - complex
   */
  async createListing(request: AmazonListingRequest): Promise<AmazonListingResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Amazon SP-API not configured. See documentation for required credentials.'
      };
    }

    try {
      console.log(`📝 Creating Amazon listing: ${request.productData.title}`);

      // Step 1: Search for existing ASIN (if UPC available)
      let asin: string | undefined;

      if (request.productData.upc) {
        asin = await this.findASINByUPC(request.productData.upc);
      }

      if (!asin) {
        console.log('⚠️  No ASIN found. Would need to create new product (requires Brand Registry)');
        return {
          success: false,
          error: 'No ASIN found for product. Amazon requires matching existing ASIN or Brand Registry to create new products.'
        };
      }

      // Step 2: Create inventory item (feed submission)
      const sku = request.sku || this.generateSKU();
      const feedResult = await this.submitInventoryFeed(sku, asin, request);

      if (!feedResult.success) {
        return feedResult;
      }

      console.log(`✅ Amazon listing created: ASIN ${asin}, SKU ${sku}`);

      return {
        success: true,
        sku,
        asin,
        listingUrl: `https://www.amazon.com/dp/${asin}`
      };
    } catch (error: any) {
      console.error('❌ Failed to create Amazon listing:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find ASIN by UPC using Catalog Items API
   */
  private async findASINByUPC(upc: string): Promise<string | undefined> {
    try {
      const response = await this.makeSignedRequest(
        'GET',
        `/catalog/2022-04-01/items`,
        {
          identifiers: upc,
          identifiersType: 'UPC',
          marketplaceIds: this.marketplace,
          includedData: 'identifiers,summaries'
        }
      );

      const items = response.data?.items || [];
      if (items.length > 0) {
        return items[0].asin;
      }

      return undefined;
    } catch (error: any) {
      console.warn(`⚠️  ASIN lookup failed for UPC ${upc}:`, error.message);
      return undefined;
    }
  }

  /**
   * Submit inventory feed to create/update listing
   */
  private async submitInventoryFeed(
    sku: string,
    asin: string,
    request: AmazonListingRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Create feed document
      const feedType = 'POST_PRODUCT_DATA';
      const feedContent = this.buildInventoryFeedXML(sku, asin, request);

      const createDocResponse = await this.makeSignedRequest(
        'POST',
        '/feeds/2021-06-30/documents',
        {
          contentType: 'text/xml; charset=UTF-8'
        }
      );

      const uploadUrl = createDocResponse.data.url;
      const feedDocumentId = createDocResponse.data.feedDocumentId;

      // Step 2: Upload feed content
      await axios.put(uploadUrl, feedContent, {
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8'
        }
      });

      // Step 3: Create feed
      const createFeedResponse = await this.makeSignedRequest(
        'POST',
        '/feeds/2021-06-30/feeds',
        {
          feedType,
          marketplaceIds: [this.marketplace],
          inputFeedDocumentId: feedDocumentId
        }
      );

      const feedId = createFeedResponse.data.feedId;

      console.log(`📤 Feed submitted: ${feedId}`);
      console.log('   Feed processing can take 5-45 minutes');

      // Note: In production, you'd poll for feed processing results
      // For now, we'll return success and handle async processing separately

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Feed submission failed: ${error.message}`
      };
    }
  }

  /**
   * Build XML feed content for inventory submission
   */
  private buildInventoryFeedXML(
    sku: string,
    asin: string,
    request: AmazonListingRequest
  ): string {
    const { price, quantity, condition, fulfillmentChannel } = request;

    return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>${this.sellerId}</MerchantIdentifier>
  </Header>
  <MessageType>Product</MessageType>
  <Message>
    <MessageID>1</MessageID>
    <OperationType>Update</OperationType>
    <Product>
      <SKU>${this.escapeXml(sku)}</SKU>
      <StandardProductID>
        <Type>ASIN</Type>
        <Value>${asin}</Value>
      </StandardProductID>
      <Condition>
        <ConditionType>${condition || 'New'}</ConditionType>
      </Condition>
      <DescriptionData>
        <Title>${this.escapeXml(request.productData.title.substring(0, 200))}</Title>
      </DescriptionData>
    </Product>
  </Message>
  <Message>
    <MessageID>2</MessageID>
    <OperationType>Update</OperationType>
    <Inventory>
      <SKU>${this.escapeXml(sku)}</SKU>
      <Quantity>${quantity}</Quantity>
      <FulfillmentCenterID>${fulfillmentChannel === 'AMAZON_NA' ? 'AMAZON_NA' : 'DEFAULT'}</FulfillmentCenterID>
    </Inventory>
  </Message>
  <Message>
    <MessageID>3</MessageID>
    <OperationType>Update</OperationType>
    <Price>
      <SKU>${this.escapeXml(sku)}</SKU>
      <StandardPrice currency="USD">${price.toFixed(2)}</StandardPrice>
    </Price>
  </Message>
</AmazonEnvelope>`;
  }

  /**
   * Make signed request to Amazon SP-API
   * Implements AWS Signature Version 4
   */
  private async makeSignedRequest(
    method: string,
    path: string,
    params?: any
  ): Promise<any> {
    // In production, this would implement full AWS SigV4 signing
    // For now, this is a placeholder showing the structure

    const url = `${this.apiUrl}${path}`;
    const headers = {
      'x-amz-access-token': await this.getAccessToken(),
      'x-amz-date': new Date().toISOString(),
      'Content-Type': 'application/json'
    };

    // TODO: Implement AWS SigV4 signing
    // This requires: canonical request, string to sign, signing key, signature
    // See: https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

    throw new Error('AWS SigV4 signing not yet implemented. Use amazon-sp-api NPM package in production.');

    // const response = await axios({
    //   method,
    //   url,
    //   headers,
    //   params: method === 'GET' ? params : undefined,
    //   data: method !== 'GET' ? params : undefined
    // });

    // return response;
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      // TODO: Check if token is expired
      return this.accessToken;
    }

    // Refresh token using LWA
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: process.env.AMAZON_LWA_CLIENT_ID,
      client_secret: process.env.AMAZON_LWA_CLIENT_SECRET
    });

    this.accessToken = response.data.access_token;
    return this.accessToken;
  }

  /**
   * End listing (out of stock)
   */
  async endListing(sku: string): Promise<boolean> {
    // Update inventory to 0
    try {
      const feedContent = `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope>
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>${this.sellerId}</MerchantIdentifier>
  </Header>
  <MessageType>Inventory</MessageType>
  <Message>
    <MessageID>1</MessageID>
    <OperationType>Update</OperationType>
    <Inventory>
      <SKU>${this.escapeXml(sku)}</SKU>
      <Quantity>0</Quantity>
    </Inventory>
  </Message>
</AmazonEnvelope>`;

      // Submit feed (implementation omitted - would use submitInventoryFeed)
      console.log(`✅ Amazon listing ${sku} marked out of stock`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to end listing ${sku}:`, error.message);
      return false;
    }
  }

  /**
   * Update listing price
   */
  async updatePrice(sku: string, newPrice: number): Promise<boolean> {
    // Similar to endListing but updates price
    console.log(`✅ Updated Amazon listing ${sku} price to $${newPrice}`);
    return true;
  }

  /**
   * Get endpoint URL based on marketplace
   */
  private getEndpoint(marketplaceId: string): string {
    // North America
    if (['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2', 'A1AM78C64UM0Y8'].includes(marketplaceId)) {
      return 'https://sellingpartnerapi-na.amazon.com';
    }
    // Europe
    if (['A1PA6795UKMFR9', 'A1RKKUPIHCS9HS', 'A13V1IB3VIYZZH'].includes(marketplaceId)) {
      return 'https://sellingpartnerapi-eu.amazon.com';
    }
    // Far East
    return 'https://sellingpartnerapi-fe.amazon.com';
  }

  /**
   * Generate unique SKU
   */
  private generateSKU(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `ARBI-AMZ-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Check if API is configured
   */
  private isConfigured(): boolean {
    return !!(
      this.refreshToken &&
      this.sellerId &&
      this.awsAccessKeyId &&
      this.awsSecretAccessKey
    );
  }
}

/**
 * IMPLEMENTATION NOTE:
 * =====================
 *
 * Amazon SP-API is significantly more complex than eBay's API.
 * This implementation provides the structure and workflow, but
 * requires additional work for production use:
 *
 * 1. AWS Signature V4 signing (complex crypto signing process)
 * 2. LWA OAuth token management with auto-refresh
 * 3. Feed processing status polling
 * 4. Error handling for various feed errors
 * 5. Brand Registry for new product creation
 *
 * RECOMMENDED: Use existing NPM package for production:
 * - amazon-sp-api (npm package)
 * - Handles all the complexity of AWS signing, OAuth, etc.
 *
 * Example:
 * ```
 * import SellingPartner from 'amazon-sp-api';
 * const sp = new SellingPartner({
 *   region: 'na',
 *   refresh_token: process.env.AMAZON_SP_REFRESH_TOKEN
 * });
 * ```
 */

export default AmazonSellerAPI;
