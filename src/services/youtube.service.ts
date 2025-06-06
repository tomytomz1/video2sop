import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../errors/appError';

class YouTubeService {
  private tempDir: string;
  private cookiesPath: string;

  constructor(tempDir: string, cookiesPath: string) {
    this.tempDir = tempDir;
    this.cookiesPath = cookiesPath;
  }

  private async getWritableCookiesPath(): Promise<string> {
    const tempCookiesPath = path.join(this.tempDir, `cookies-${uuidv4()}.txt`);
    // Log source cookies path
    logger.info(`[yt-dlp debug] Source cookiesPath: ${this.cookiesPath}`);
    try {
      const stats = await fs.stat(this.cookiesPath);
      logger.info(`[yt-dlp debug] Source cookies.txt exists, size: ${stats.size} bytes`);
    } catch (err) {
      logger.error(`[yt-dlp debug] Source cookies.txt does NOT exist or is not readable!`);
    }
    await fs.copyFile(this.cookiesPath, tempCookiesPath);
    // Log temp cookies path
    logger.info(`[yt-dlp debug] Temp cookiesPath: ${tempCookiesPath}`);
    try {
      const stats = await fs.stat(tempCookiesPath);
      logger.info(`[yt-dlp debug] Temp cookies.txt exists, size: ${stats.size} bytes`);
    } catch (err) {
      logger.error(`[yt-dlp debug] Temp cookies.txt does NOT exist or is not readable!`);
    }
    return tempCookiesPath;
  }

  async validateUrl(url: string): Promise<YouTubeValidationResult> {
    logger.info('Validating URL:', url);
    // ... existing code ...
    let tempCookiesPath = '';
    try {
      tempCookiesPath = await this.getWritableCookiesPath();
      logger.info(`[yt-dlp debug] yt-dlp will use cookies file: ${tempCookiesPath}`);
      const args = [
        url,
        '--skip-download',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificate',
        '--dump-json',
        '--cookies', tempCookiesPath,
        '--no-cache-dir',
        '--no-write-playlist-metafiles'
      ];
      const { stdout, stderr } = await this.executeYtDlp(args);
    } catch (error) {
      logger.error('Error validating URL:', error);
      throw new AppError('Error validating URL', 500);
    }
    // ... existing code ...
  }

  async downloadVideo(url: string, outputPath: string): Promise<string> {
    await this.checkYtDlp().catch(error => {
      logger.error('yt-dlp check failed:', error);
      throw new AppError('yt-dlp is not properly installed', 500);
    });
    await this.validateCookiesFile();
    let tempCookiesPath = '';
    return new Promise(async (resolve, reject) => {
      try {
        tempCookiesPath = await this.getWritableCookiesPath();
        logger.info(`[yt-dlp debug] yt-dlp will use cookies file: ${tempCookiesPath}`);
        const baseArgs = [
          url,
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '-o', outputPath,
          '--no-playlist',
          '--no-warnings',
          '--no-check-certificate',
          '--prefer-ffmpeg',
          '--merge-output-format', 'mp4',
          '--newline',
          '--progress-template', '%(progress._percent_str)s'
        ];
        const args = [
          ...baseArgs,
          '--cookies', tempCookiesPath,
          '--no-cache-dir',
          '--no-write-playlist-metafiles'
        ];
        logger.info(`Running yt-dlp with args: ${args.join(' ')}`);
        // ... existing code ...
      } catch (error) {
        logger.error('Error downloading video:', error);
        reject(new AppError('Error downloading video', 500));
      }
    });
  }
}

export default YouTubeService; 