const listCampaigns = jest.fn();
const setCampaignStatus = jest.fn();
const getListings = jest.fn();
const updateListing = jest.fn();
const validateProduct = jest.fn();

jest.mock('./campaignAutomation', () => ({
  listCampaigns: (...a: any[]) => listCampaigns(...a),
  setCampaignStatus: (...a: any[]) => setCampaignStatus(...a),
}));
jest.mock('../../routes/marketplace', () => ({
  getListings: (...a: any[]) => getListings(...a),
  updateListing: (...a: any[]) => updateListing(...a),
}));
jest.mock('../productValidator', () => ({
  productValidator: { validateProduct: (...a: any[]) => validateProduct(...a) },
}));

import { syncAdsToStock, campaignMatchesListing } from './stockSync';

beforeEach(() => {
  listCampaigns.mockReset(); setCampaignStatus.mockReset();
  getListings.mockReset(); updateListing.mockReset(); validateProduct.mockReset();
});

describe('campaignMatchesListing', () => {
  it('matches a campaign to its product by title', () => {
    expect(campaignMatchesListing('Arbi - Wireless Earbuds Pro - US - 1712', 'Wireless Earbuds Pro')).toBe(true);
    expect(campaignMatchesListing('Arbi - Some Other Thing - US', 'Wireless Earbuds Pro')).toBe(false);
  });
});

describe('syncAdsToStock', () => {
  it('pauses live campaigns for out-of-stock products and marks the listing', async () => {
    listCampaigns.mockResolvedValue([
      { id: 'c1', name: 'Arbi - Cool Necklace - US - 1', status: 'ENABLED' },
      { id: 'c2', name: 'Arbi - Hot Watch - US - 2', status: 'ENABLED' },
    ]);
    getListings.mockResolvedValue([
      { listingId: 'L1', productTitle: 'Cool Necklace', supplierPrice: 10, supplierUrl: 'x' },
      { listingId: 'L2', productTitle: 'Hot Watch', supplierPrice: 20, supplierUrl: 'y' },
    ]);
    // Necklace OOS, Watch in stock.
    validateProduct.mockImplementation(async (l: any) => ({ inStock: l.productTitle !== 'Cool Necklace' }));

    const r = await syncAdsToStock();

    expect(r.checked).toBe(2);
    expect(r.outOfStock).toBe(1);
    expect(setCampaignStatus).toHaveBeenCalledWith('c1', 'PAUSED', undefined);
    expect(setCampaignStatus).not.toHaveBeenCalledWith('c2', 'PAUSED', undefined);
    expect(updateListing).toHaveBeenCalledWith('L1', { status: 'out_of_stock' });
  });

  it('skips products with no live campaign (bounded API usage)', async () => {
    listCampaigns.mockResolvedValue([{ id: 'c1', name: 'Arbi - Cool Necklace - US', status: 'PAUSED' }]);
    getListings.mockResolvedValue([{ listingId: 'L1', productTitle: 'Cool Necklace', supplierPrice: 10 }]);
    const r = await syncAdsToStock();
    expect(r.checked).toBe(0);
    expect(validateProduct).not.toHaveBeenCalled();
  });

  it('leaves campaigns running if stock cannot be verified', async () => {
    listCampaigns.mockResolvedValue([{ id: 'c1', name: 'Arbi - Cool Necklace - US', status: 'ENABLED' }]);
    getListings.mockResolvedValue([{ listingId: 'L1', productTitle: 'Cool Necklace', supplierPrice: 10 }]);
    validateProduct.mockRejectedValue(new Error('timeout'));
    const r = await syncAdsToStock();
    expect(setCampaignStatus).not.toHaveBeenCalled();
    expect(r.outOfStock).toBe(0);
  });
});
