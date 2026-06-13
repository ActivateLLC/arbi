/**
 * Automated test for the TikTok Ads creation path.
 *
 * Mocks axios so we validate the request structure our automation sends to the
 * TikTok Marketing API (campaign -> ad group -> image -> ad) without live calls,
 * and critically asserts every entity is created PAUSED (operation_status DISABLE)
 * so it can never auto-spend.
 */

jest.mock('axios');
import axios from 'axios';
import { TikTokMarketingService } from './tiktokMarketing';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const posts: Record<string, any> = {};

const cfg = {
  productTitle: 'Premium Wireless Earbuds',
  productDescription: 'Great sound',
  productImage: 'https://img.example/x.jpg',
  landingPageUrl: 'https://api.arbi.creai.dev/product/listing_test',
  marketplacePrice: 29.99,
  dailyBudget: 20,
};

beforeAll(() => {
  (mockedAxios.get as jest.Mock).mockResolvedValue({ data: Buffer.from('img') });
  (mockedAxios.post as jest.Mock).mockImplementation(async (url: string, body: any) => {
    if (url.includes('/campaign/create')) { posts.campaign = body; return { data: { code: 0, data: { campaign_id: 'c1' } } }; }
    if (url.includes('/adgroup/create')) { posts.adgroup = body; return { data: { code: 0, data: { adgroup_id: 'ag1' } } }; }
    if (url.includes('/file/image/ad/upload')) { posts.image = body; return { data: { code: 0, data: { image_id: 'img1' } } }; }
    if (url.includes('/ad/create')) { posts.ad = body; return { data: { code: 0, data: { ad_id: 'ad1' } } }; }
    return { data: { code: 0, data: {} } };
  });
});

describe('TikTok ads automation', () => {
  it('builds a full campaign with every entity created PAUSED', async () => {
    process.env.TIKTOK_ACCESS_TOKEN = 'tok';
    process.env.TIKTOK_ADVERTISER_ID = 'adv1';
    const svc = new TikTokMarketingService();

    const res = await svc.createCampaign(cfg);

    expect(res.success).toBe(true);
    expect(res).toMatchObject({ campaignId: 'c1', adGroupId: 'ag1', adId: 'ad1' });

    // Safety: nothing may auto-spend — all three entities PAUSED.
    expect(posts.campaign.operation_status).toBe('DISABLE');
    expect(posts.adgroup.operation_status).toBe('DISABLE');
    expect(posts.ad.operation_status).toBe('DISABLE');

    // Structure sanity.
    expect(posts.campaign.objective_type).toBe('CONVERSIONS');
    expect(posts.adgroup.budget).toBe(20);
    expect(posts.ad.landing_page_url).toBe(cfg.landingPageUrl);
  });

  it('fails cleanly when not configured (no keys)', async () => {
    const tok = process.env.TIKTOK_ACCESS_TOKEN;
    const adv = process.env.TIKTOK_ADVERTISER_ID;
    delete process.env.TIKTOK_ACCESS_TOKEN;
    delete process.env.TIKTOK_ADVERTISER_ID;

    const svc = new TikTokMarketingService();
    const res = await svc.createCampaign(cfg);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not configured/i);

    process.env.TIKTOK_ACCESS_TOKEN = tok;
    process.env.TIKTOK_ADVERTISER_ID = adv;
  });
});
