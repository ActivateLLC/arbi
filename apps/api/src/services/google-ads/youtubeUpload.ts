/**
 * YouTube upload — hosts a generated UGC video on YouTube so it can be used as
 * a Google Ads video asset (Demand Gen / YouTube video campaigns require a
 * YouTube-hosted video; there is no raw-bytes video upload in Google Ads).
 *
 * Auth reuses the shared Google access token (googleAdsRest). The Google OAuth
 * refresh token must include the youtube.upload scope — granted via the
 * /api/google-ads/youtube-oauth flow, which mints a token covering BOTH
 * adwords and youtube so one credential drives ads + uploads.
 *
 * Uploads are unlisted by default: usable as an ad asset, not shown on the
 * channel's public feed.
 */

import axios from 'axios';
import { getAccessToken } from './googleAdsRest';

export interface YouTubeUploadResult {
  videoId: string;
  watchUrl: string;
  privacyStatus: string;
}

/**
 * Upload a hosted video (e.g. a Higgsfield URL) to YouTube via a single
 * multipart/related videos.insert. Fine for short UGC clips (a few MB).
 */
export async function uploadVideoToYouTube(opts: {
  videoUrl: string;
  title: string;
  description?: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
}): Promise<YouTubeUploadResult> {
  if (!opts.videoUrl) throw new Error('videoUrl is required to upload to YouTube.');
  const token = await getAccessToken();

  // Pull the rendered video bytes.
  const dl = await axios.get(opts.videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
  const videoBuffer = Buffer.from(dl.data);

  const privacyStatus = opts.privacyStatus || 'unlisted';
  const metadata = JSON.stringify({
    snippet: {
      title: (opts.title || 'Arbi Product').slice(0, 100),
      description: (opts.description || '').slice(0, 4900),
      categoryId: '22', // People & Blogs — safe default for UGC
    },
    status: { privacyStatus, selfDeclaredMadeForKids: false },
  });

  // multipart/related: JSON metadata part, then the binary video part.
  const boundary = `arbi_yt_${Date.now()}`;
  const pre = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: video/*\r\n\r\n`
  );
  const post = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([pre, videoBuffer, post]);

  const url = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';
  const r = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 180000,
    validateStatus: () => true,
  });

  if (r.status !== 200 || !r.data?.id) {
    const detail = r.data?.error?.message || `status ${r.status}`;
    throw new Error(`YouTube upload failed: ${detail}`);
  }
  const videoId = r.data.id as string;
  return { videoId, watchUrl: `https://www.youtube.com/watch?v=${videoId}`, privacyStatus };
}
