jest.mock('axios');
const saveListing = jest.fn();
jest.mock('../routes/marketplace', () => ({ saveListing: (...a: any[]) => saveListing(...a) }));

import axios from 'axios';
import { sourceTrendingFromAmazon, isAmazonSourcingConfigured } from './amazonSourcing';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const SEARCH_RESULTS = {
  search_results: [
    { title: 'Popular Gadget', asin: 'B001', link: 'https://amazon.com/dp/B001', image: 'https://img/1.jpg', price: { value: 25 }, ratings_total: 4200 },
    { title: 'Niche Item (too few reviews)', asin: 'B002', image: 'https://img/2.jpg', price: { value: 15 }, ratings_total: 3 },
    { title: 'Overpriced', asin: 'B003', image: 'https://img/3.jpg', price: { value: 999 }, ratings_total: 5000 },
    { title: 'No Image', asin: 'B004', price: { value: 30 }, ratings_total: 900 },
    { title: 'Solid Seller', asin: 'B005', link: 'https://amazon.com/dp/B005', image: 'https://img/5.jpg', price: { value: 40 }, ratings_total: 800 },
  ],
};

beforeEach(() => {
  saveListing.mockReset();
  (mockedAxios.get as jest.Mock).mockReset();
  process.env.RAINFOREST_API_KEY = 'rf-key';
});

describe('amazon sourcing (Rainforest)', () => {
  it('reports not configured without a key', () => {
    delete process.env.RAINFOREST_API_KEY;
    expect(isAmazonSourcingConfigured()).toBe(false);
  });

  it('keeps only high-demand, affordable, imaged products and applies the markup', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: SEARCH_RESULTS });

    const r = await sourceTrendingFromAmazon({ count: 10, markupPercentage: 100, minReviews: 50, maxPrice: 200 });

    expect(r.success).toBe(true);
    // B002 (3 reviews), B003 ($999), B004 (no image) all excluded -> 2 kept.
    expect(r.sourced).toBe(2);
    expect(saveListing).toHaveBeenCalledTimes(2);

    // Highest reviews first (B001 4200 > B005 800), 100% markup applied.
    const first = saveListing.mock.calls[0][0];
    expect(first.supplierPlatform).toBe('amazon');
    expect(first.productTitle).toBe('Popular Gadget');
    expect(first.supplierPrice).toBe(25);
    expect(first.marketplacePrice).toBe(50);
    expect(first.estimatedProfit).toBe(25);
  });

  it('preview mode does not persist', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: SEARCH_RESULTS });
    const r = await sourceTrendingFromAmazon({ preview: true });
    expect(r.sourced).toBeGreaterThan(0);
    expect(saveListing).not.toHaveBeenCalled();
  });

  it('fails cleanly when the API errors', async () => {
    (mockedAxios.get as jest.Mock).mockRejectedValue({ message: 'rate limited' });
    const r = await sourceTrendingFromAmazon({});
    expect(r.success).toBe(false);
    expect(r.sourced).toBe(0);
  });
});
