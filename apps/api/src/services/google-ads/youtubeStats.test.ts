import { youtubeVideoId, getVideoStats } from './youtubeStats';

describe('youtube organic stats', () => {
  it('extracts the video id from watch / shorts / youtu.be URLs and bare ids', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId(undefined)).toBeUndefined();
    expect(youtubeVideoId('not a url')).toBeUndefined();
  });

  it('getVideoStats returns {} gracefully with no ids / no auth (never throws)', async () => {
    await expect(getVideoStats([])).resolves.toEqual({});
  });
});
