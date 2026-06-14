// Mock the Higgsfield SDK so we test our integration without network/credits.
const subscribe = jest.fn();
jest.mock('@higgsfield/client/v2', () => ({
  createHiggsfieldClient: jest.fn(() => ({ subscribe })),
}), { virtual: true });

import { isConfigured, buildMotionPrompt, generateProductVideo } from './higgsfieldVideo';
import { buildCreativeBrief } from './adCreative';
import { ProductAdData } from './campaignAutomation';

const product: ProductAdData = {
  productId: 'p1',
  productName: 'Infinity Love Cross Birthstone Pendant Necklace',
  productPrice: 29.99,
  profitMargin: 45,
  category: 'Jewelry',
  targetCountry: 'US',
  landingPageUrl: 'https://api.arbi.creai.dev/product/listing_test',
};

describe('higgsfield video generation', () => {
  beforeEach(() => {
    subscribe.mockReset();
    process.env.HF_API_KEY = 'key-id';
    process.env.HF_API_SECRET = 'key-secret';
  });

  it('reports configured when both credentials are present', () => {
    expect(isConfigured()).toBe(true);
    const k = process.env.HF_API_KEY; delete process.env.HF_API_KEY;
    expect(isConfigured()).toBe(false);
    process.env.HF_API_KEY = k;
  });

  it('builds a hook-forward 9:16 UGC motion prompt', () => {
    const prompt = buildMotionPrompt(buildCreativeBrief(product));
    expect(prompt).toMatch(/9:16/);
    expect(prompt.toLowerCase()).toContain('ugc');
    expect(prompt.length).toBeGreaterThan(40);
  });

  it('calls image2video with the product image and returns the video url', async () => {
    subscribe.mockResolvedValue({ status: 'completed', video: { url: 'https://cdn.hf/out.mp4' } });
    const r = await generateProductVideo(product, 'https://img/p.jpg');
    expect(r.videoUrl).toBe('https://cdn.hf/out.mp4');
    const [endpoint, opts] = subscribe.mock.calls[0];
    expect(endpoint).toBe('/v1/image2video/dop');
    expect(opts.input.input_images[0].image_url).toBe('https://img/p.jpg');
    expect(opts.withPolling).toBe(true);
  });

  it('throws a clear error when generation does not complete', async () => {
    subscribe.mockResolvedValue({ status: 'failed' });
    await expect(generateProductVideo(product, 'https://img/p.jpg')).rejects.toThrow(/failed/i);
  });

  it('requires an image url', async () => {
    await expect(generateProductVideo(product, '')).rejects.toThrow(/image url is required/i);
  });
});
