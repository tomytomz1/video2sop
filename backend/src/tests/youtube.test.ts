import { YouTubeService } from '../services/youtube.service';
import { promises as fs } from 'fs';
import path from 'path';

const youtubeService = new YouTubeService();
const testCases = [
  // Valid URLs
  {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    shouldBeValid: true,
  },
  {
    url: 'https://youtu.be/dQw4w9WgXcQ',
    shouldBeValid: true,
  },
  {
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    shouldBeValid: true,
  },
  // Invalid URLs
  {
    url: 'https://www.youtube.com/watch?v=invalid',
    shouldBeValid: false,
  },
  {
    url: 'https://not-youtube.com/video',
    shouldBeValid: false,
  },
  {
    url: 'https://www.youtube.com/watch?v=',
    shouldBeValid: false,
  },
];

describe('YouTubeService', () => {
  describe('validateUrl', () => {
    testCases.forEach(({ url, shouldBeValid }) => {
      test(`validateUrl returns ${shouldBeValid} for ${url}`, async () => {
        const result = await youtubeService.validateUrl(url);
        expect(result.isValid).toBe(shouldBeValid);
      }, 30000);
    });
  });

  describe('getVideoInfo and downloadVideo', () => {
    const validUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
    let videoPath: string;

    test('getVideoInfo returns correct info for a valid URL', async () => {
      const result = await youtubeService.validateUrl(validUrl);
      expect(result.isValid).toBe(true);
      if (!result.isValid || !result.videoInfo) throw new Error('Video info missing');
      expect(result.videoInfo.id).toBeDefined();
      expect(result.videoInfo.title).toBeDefined();
      expect(result.videoInfo.duration).toBeGreaterThan(0);
      expect(result.videoInfo.thumbnail).toBeDefined();
    }, 30000);

    test('downloadVideo downloads a video file', async () => {
      const outputPath = path.join(process.cwd(), 'uploads', 'temp', 'test-video.mp4');
      videoPath = await youtubeService.downloadVideo(validUrl, outputPath);
      const stats = await fs.stat(videoPath);
      expect(stats.size).toBeGreaterThan(0);
    }, 30000);

    afterAll(async () => {
      // Clean up downloaded file
      if (videoPath) {
        await fs.unlink(videoPath);
      }
    });
  });
}); 