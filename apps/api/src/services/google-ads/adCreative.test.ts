import { buildCreativeBrief, buildHooks, buildScript } from './adCreative';
import { ProductAdData } from './campaignAutomation';

const product: ProductAdData = {
  productId: 'p1',
  productName: 'Infinity Love God We Trust Christian Cross Birthstone Crystal Pendant Necklace',
  productPrice: 29.99,
  profitMargin: 45,
  category: 'Jewelry',
  targetCountry: 'US',
  landingPageUrl: 'https://api.arbi.creai.dev/product/listing_test',
};

describe('ad creative engine (proven UGC structure)', () => {
  it('produces several unique hooks within overlay length', () => {
    const hooks = buildHooks(product);
    expect(hooks.length).toBeGreaterThanOrEqual(5);
    for (const h of hooks) expect(h.length).toBeLessThanOrEqual(60);
    expect(new Set(hooks.map((h) => h.toLowerCase())).size).toBe(hooks.length);
  });

  it('builds the proven 5-beat script (hook→problem→solution→proof→cta)', () => {
    const beats = buildScript(product);
    expect(beats.map((b) => b.part)).toEqual(['hook', 'problem', 'solution', 'proof', 'cta']);
    // Hook must land fast (research: first 1.7–3s decides 90% of retention).
    expect(beats[0].seconds).toBeLessThanOrEqual(3);
    for (const b of beats) {
      expect(b.vo.length).toBeGreaterThan(0);
      expect(b.onScreen.length).toBeGreaterThan(0); // captions mandatory (muted viewers)
    }
  });

  it('assembles a 9:16 captioned brief in the 15–35s sweet spot', () => {
    const brief = buildCreativeBrief(product);
    expect(brief.format.aspectRatio).toBe('9:16');
    expect(brief.format.captions).toBe(true);
    expect(brief.format.targetSeconds).toBeGreaterThanOrEqual(15);
    expect(brief.format.targetSeconds).toBeLessThanOrEqual(35);
    expect(brief.captionLines.length).toBe(brief.script.length);
    expect(brief.primaryTexts.length).toBeGreaterThan(0);
    expect(brief.ctas.length).toBeGreaterThan(0);
  });
});
