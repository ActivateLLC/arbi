/**
 * YouTube organic stats — reads public view/engagement counts for videos we
 * posted, using the same Google OAuth token as the uploader. This is the FREE,
 * real-market demand signal that drives the organic-first model: post a Short,
 * watch what gets traction, and only THEN amplify the winners with paid budget.
 *
 * Graceful: returns nulls on any error (no token, quota, deleted video) so the
 * cycle never breaks on a stats read.
 */
import axios from 'axios';
import { getAccessToken } from './googleAdsRest';

export interface VideoStats { views: number; likes: number; comments: number }

/** Extract a YouTube videoId from a watch URL or return the id as-is. */
export function youtubeVideoId(urlOrId?: string): string | undefined {
  if (!urlOrId) return undefined;
  const s = String(urlOrId);
  const m = s.match(/[?&]v=([\w-]{6,})/) || s.match(/youtu\.be\/([\w-]{6,})/) || s.match(/\/shorts\/([\w-]{6,})/);
  if (m) return m[1];
  return /^[\w-]{6,}$/.test(s) ? s : undefined;
}

/** Fetch statistics for up to 50 video ids in one call. Returns a map id→stats. */
export async function getVideoStats(videoIds: string[]): Promise<Record<string, VideoStats>> {
  const ids = Array.from(new Set(videoIds.filter(Boolean))).slice(0, 50);
  if (!ids.length) return {};
  let token: string;
  try { token = await getAccessToken(); } catch { return {}; }
  try {
    const r = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { part: 'statistics', id: ids.join(',') },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
      validateStatus: () => true,
    });
    const out: Record<string, VideoStats> = {};
    for (const item of (r.data?.items || [])) {
      const st = item?.statistics || {};
      out[item.id] = {
        views: Number(st.viewCount) || 0,
        likes: Number(st.likeCount) || 0,
        comments: Number(st.commentCount) || 0,
      };
    }
    return out;
  } catch {
    return {};
  }
}
