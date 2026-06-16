/**
 * Exactly-once campaign reservation semantics (exercised via the in-memory
 * fallback — same contract the DB UNIQUE index enforces in production).
 */
import { reserveCampaignSlot, markCampaignCreated, releaseFailedReservation } from './campaignRegistry';

describe('campaign registry — reserve-before-create', () => {
  it('first reserve wins; a second for the same (tenant,listing,channel) is "exists"', async () => {
    expect(await reserveCampaignSlot('t1', 'listingA', 'SEARCH')).toBe('won');
    expect(await reserveCampaignSlot('t1', 'listingA', 'SEARCH')).toBe('exists');
  });

  it('the same listing on a different channel is its own slot', async () => {
    expect(await reserveCampaignSlot('t1', 'listingB', 'SEARCH')).toBe('won');
    expect(await reserveCampaignSlot('t1', 'listingB', 'VIDEO')).toBe('won');
  });

  it('a created slot stays claimed (no second creation)', async () => {
    expect(await reserveCampaignSlot('t1', 'listingC', 'SEARCH')).toBe('won');
    await markCampaignCreated('t1', 'listingC', 'SEARCH', 'cmp_123', 'Arbi - C');
    expect(await reserveCampaignSlot('t1', 'listingC', 'SEARCH')).toBe('exists');
  });

  it('releasing a failed reservation lets the slot be retried', async () => {
    expect(await reserveCampaignSlot('t1', 'listingD', 'SEARCH')).toBe('won');
    await releaseFailedReservation('t1', 'listingD', 'SEARCH', 'boom');
    expect(await reserveCampaignSlot('t1', 'listingD', 'SEARCH')).toBe('won');
  });
});
