// Verify the one-tap go-live controls build the right Google Ads REST calls.
jest.mock('axios');
import axios from 'axios';
import { setCampaignStatus, listCampaigns } from './campaignAutomation';

const mockedAxios = axios as jest.Mocked<typeof axios>;
let lastMutateBody: any;

beforeEach(() => {
  process.env.GOOGLE_ADS_CLIENT_ID = 'x';
  process.env.GOOGLE_ADS_CLIENT_SECRET = 'x';
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'x';
  process.env.GOOGLE_ADS_REFRESH_TOKEN = 'x';
  process.env.GOOGLE_ADS_CUSTOMER_ID = '7916628817';
  lastMutateBody = undefined;

  (mockedAxios.post as jest.Mock).mockImplementation(async (url: string, body: any) => {
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return { data: { access_token: 't', expires_in: 3600 } };
    }
    if (String(url).includes('/campaigns:mutate')) {
      lastMutateBody = body;
      return { data: { results: [{ resourceName: 'customers/7916628817/campaigns/222' }] } };
    }
    if (String(url).includes('googleAds:search')) {
      return { data: { results: [{
        campaign: { id: '222', name: 'Arbi - Test', status: 'PAUSED', advertisingChannelType: 'SEARCH' },
        metrics: { impressions: '100', clicks: '5', costMicros: '2000000', conversions: '1', conversionsValue: '80' },
      }] } };
    }
    return { data: {} };
  });
});

describe('campaign go-live controls', () => {
  it('enables a campaign with an update + updateMask on the right resource', async () => {
    const rn = await setCampaignStatus('222', 'ENABLED');
    expect(rn).toBe('customers/7916628817/campaigns/222');
    const op = lastMutateBody.operations[0];
    expect(op.update.resourceName).toBe('customers/7916628817/campaigns/222');
    expect(op.update.status).toBe('ENABLED');
    expect(op.updateMask).toBe('status');
  });

  it('pauses a campaign (status PAUSED)', async () => {
    await setCampaignStatus('222', 'PAUSED');
    expect(lastMutateBody.operations[0].update.status).toBe('PAUSED');
  });

  it('lists campaigns with status + computed ROAS', async () => {
    const [c] = await listCampaigns();
    expect(c.id).toBe('222');
    expect(c.status).toBe('PAUSED');
    expect(c.spend).toBe(2);       // 2,000,000 micros
    expect(c.revenue).toBe(80);
    expect(c.roas).toBe(40);       // 80 / 2
  });
});
