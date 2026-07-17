// Verify conversion-action setup parsing and the gtag HTML helpers.
const adsMutate = jest.fn();
const adsPost = jest.fn();
jest.mock('./googleAdsRest', () => ({
  adsMutate: (...a: any[]) => adsMutate(...a),
  adsPost: (...a: any[]) => adsPost(...a),
  digits: (s: string) => (s || '').replace(/-/g, ''),
  envCustomerId: () => '7916628817',
}));

import {
  ensureConversionAction,
  googleAdsGlobalTagHtml,
  googleAdsConversionEventHtml,
  conversionSendTo,
} from './googleAdsConversions';

const EVENT_SNIPPET = `<script> gtag('event', 'conversion', {'send_to': 'AW-123456789/AbC-D_efGh', 'value': 1.0, 'currency': 'USD'}); </script>`;

beforeEach(() => {
  adsMutate.mockReset();
  adsPost.mockReset();
  delete process.env.GOOGLE_ADS_CONVERSION_SEND_TO;
});

describe('conversion action setup', () => {
  it('reuses an existing "Arbi Purchase" action and parses its send_to', async () => {
    adsPost.mockResolvedValueOnce({
      results: [{ conversionAction: { id: '555', resourceName: 'customers/7916628817/conversionActions/555', tagSnippets: [{ eventSnippet: EVENT_SNIPPET }] } }],
    });
    const info = await ensureConversionAction();
    expect(adsMutate).not.toHaveBeenCalled(); // existing -> no create
    expect(info.conversionActionId).toBe('555');
    expect(info.sendTo).toBe('AW-123456789/AbC-D_efGh');
    expect(info.globalTagId).toBe('AW-123456789');
  });

  it('creates the action when none exists, then reads the tag back', async () => {
    adsPost
      .mockResolvedValueOnce({ results: [] }) // first lookup: none
      .mockResolvedValueOnce({ results: [{ conversionAction: { id: '777', tagSnippets: [{ eventSnippet: EVENT_SNIPPET }] } }] }); // after create
    adsMutate.mockResolvedValueOnce(['customers/7916628817/conversionActions/777']);
    const info = await ensureConversionAction();
    expect(adsMutate).toHaveBeenCalledTimes(1);
    const op = adsMutate.mock.calls[0][1][0].create;
    expect(op.type).toBe('WEBPAGE');
    expect(op.category).toBe('PURCHASE');
    expect(info.sendTo).toBe('AW-123456789/AbC-D_efGh');
  });
});

describe('gtag HTML helpers', () => {
  it('emit nothing when conversion tracking is not configured', () => {
    expect(googleAdsGlobalTagHtml()).toBe('');
    expect(googleAdsConversionEventHtml(29.99, 'cs_test_123')).toBe('');
    expect(conversionSendTo()).toBe('');
  });

  it('emit the global tag + a purchase event when configured', () => {
    process.env.GOOGLE_ADS_CONVERSION_SEND_TO = 'AW-123456789/AbC-D_efGh';
    const global = googleAdsGlobalTagHtml();
    expect(global).toContain('googletagmanager.com/gtag/js?id=AW-123456789');
    expect(global).toContain("gtag('config', 'AW-123456789')");

    const evt = googleAdsConversionEventHtml(29.99, 'cs_test_123!@#');
    expect(evt).toContain("'send_to': 'AW-123456789/AbC-D_efGh'");
    expect(evt).toContain("'value': 29.99");
    expect(evt).toContain("'currency': 'USD'");
    expect(evt).toContain("'transaction_id': 'cs_test_123'"); // sanitized
  });
});
