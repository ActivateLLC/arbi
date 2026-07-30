jest.mock('axios');
jest.mock('./googleAdsRest', () => ({ getAccessToken: jest.fn(async () => 'fake-token') }));

import axios from 'axios';
import { uploadVideoToYouTube } from './youtubeUpload';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('youtube upload', () => {
  beforeEach(() => {
    (mockedAxios.get as jest.Mock).mockReset();
    (mockedAxios.post as jest.Mock).mockReset();
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: Buffer.from('fakevideobytes') });
  });

  it('uploads via multipart/related and returns a watch url', async () => {
    (mockedAxios.post as jest.Mock).mockResolvedValue({ status: 200, data: { id: 'abc123' } });

    const r = await uploadVideoToYouTube({ videoUrl: 'https://cdn.hf/out.mp4', title: 'Cool Necklace', description: 'POV: you found it' });

    expect(r.videoId).toBe('abc123');
    expect(r.watchUrl).toBe('https://www.youtube.com/watch?v=abc123');
    expect(r.privacyStatus).toBe('unlisted'); // ad-usable, not on public feed

    const [url, , config] = (mockedAxios.post as jest.Mock).mock.calls[0];
    expect(String(url)).toContain('/upload/youtube/v3/videos');
    expect(config.headers['Content-Type']).toMatch(/^multipart\/related; boundary=/);
    expect(config.headers.Authorization).toBe('Bearer fake-token');
  });

  it('throws a clear error when YouTube rejects the upload', async () => {
    (mockedAxios.post as jest.Mock).mockResolvedValue({ status: 403, data: { error: { message: 'quotaExceeded' } } });
    await expect(
      uploadVideoToYouTube({ videoUrl: 'https://cdn.hf/out.mp4', title: 'X' })
    ).rejects.toThrow(/quotaExceeded/);
  });

  it('requires a video url', async () => {
    await expect(uploadVideoToYouTube({ videoUrl: '', title: 'X' })).rejects.toThrow(/videoUrl is required/i);
  });
});
