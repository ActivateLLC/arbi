// Mock the documented REST path so we test our integration without network/credits.
const submitAndWait = jest.fn();
const videoModelId = jest.fn(() => 'higgsfield-ai/dop/standard');
jest.mock('./higgsfieldRest', () => ({
  submitAndWait: (...args: any[]) => submitAndWait(...args),
  videoModelId: () => videoModelId(),
}));

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
    submitAndWait.mockReset();
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

  it('submits to the REST model with the product image and returns the video url', async () => {
    submitAndWait.mockResolvedValue({ status: 'completed', videoUrl: 'https://cdn.hf/out.mp4' });
    const r = await generateProductVideo(product, 'https://img/p.jpg');
    expect(r.videoUrl).toBe('https://cdn.hf/out.mp4');
    const [modelId, args] = submitAndWait.mock.calls[0];
    expect(modelId).toBe('higgsfield-ai/dop/standard');
    expect(args.image_url).toBe('https://img/p.jpg');
    expect(typeof args.prompt).toBe('string');
    expect(args.prompt.length).toBeGreaterThan(40);
  });

  it('throws a clear error when generation returns no video', async () => {
    submitAndWait.mockResolvedValue({ status: 'failed' });
    await expect(generateProductVideo(product, 'https://img/p.jpg')).rejects.toThrow(/no video/i);
  });

  it('requires an image url', async () => {
    await expect(generateProductVideo(product, '')).rejects.toThrow(/image url is required/i);
  });
});
