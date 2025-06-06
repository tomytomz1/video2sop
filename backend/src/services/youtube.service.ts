import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { YouTubeValidationResult } from '../types/youtube.types';

export class YouTubeService {
  private readonly downloadDir: string;
  private readonly tempDir: string;
  private readonly cookiesPath: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  constructor() {
    this.downloadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.tempDir = path.join(this.downloadDir, 'temp');
    this.cookiesPath = process.env.YTDLP_COOKIES_PATH || path.join(process.cwd(), 'cookies.txt');
    this.ensureDirs().catch(error => {
      logger.error('Failed to create directories:', error);
    });
  }

  private async ensureDirs(): Promise<void> {
    try {
      await fs.mkdir(this.downloadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info(`Created directories: ${this.downloadDir} and ${this.tempDir}`);
    } catch (error) {
      logger.error('Failed to create YouTube download directories:', error);
      throw new AppError('Failed to initialize YouTube download directories', 500);
    }
  }

  private async checkYtDlp(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ytDlp = spawn('yt-dlp', ['--version']);
      
      ytDlp.stdout.on('data', (data) => {
        logger.info(`yt-dlp version: ${data.toString().trim()}`);
      });

      ytDlp.stderr.on('data', (data) => {
        logger.error(`yt-dlp stderr: ${data.toString()}`);
      });

      ytDlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp check failed with code ${code}`));
        }
      });

      ytDlp.on('error', (error) => {
        logger.error('yt-dlp error:', error);
        reject(error);
      });
    });
  }

  private async validateCookiesFile(): Promise<boolean> {
    try {
      await fs.access(this.cookiesPath);
      const stats = await fs.stat(this.cookiesPath);
      return stats.size > 0;
    } catch (error) {
      logger.error('Cookies file validation failed:', error);
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const ytDlp = spawn('yt-dlp', args);
        
        let stdout = '';
        let stderr = '';
        
        ytDlp.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        ytDlp.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        return new Promise((resolve, reject) => {
          ytDlp.on('close', (code) => {
            if (code === 0) {
              resolve({ stdout, stderr });
            } else {
              // Check if we're rate limited
              if (stderr.includes('HTTP Error 429') || stderr.includes('Too Many Requests')) {
                const delay = this.baseDelay * Math.pow(2, attempt);
                logger.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
                setTimeout(() => {
                  reject(new Error('Rate limited, retrying...'));
                }, delay);
              } else {
                reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
              }
            }
          });
          
          ytDlp.on('error', (error) => {
            reject(error);
          });
        });
      } catch (error) {
        lastError = error as Error;
        if (error instanceof Error && error.message.includes('Rate limited')) {
          continue;
        }
        throw error;
      }
    }
    
    throw lastError || new Error('Failed to execute yt-dlp after all retries');
  }

  private async getWritableCookiesPath(): Promise<string> {
    const tempCookiesPath = path.join(this.tempDir, `cookies-${uuidv4()}.txt`);
    await fs.copyFile(this.cookiesPath, tempCookiesPath);
    return tempCookiesPath;
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn(`Failed to delete temp file: ${filePath}`);
    }
  }

  async validateUrl(url: string): Promise<YouTubeValidationResult> {
    logger.info('Validating URL:', url);
    
    // Check for both standard and short YouTube URL formats
    const isStandardUrl = url.includes('youtube.com/watch?v=');
    const isShortUrl = url.includes('youtu.be/');
    
    if (!isStandardUrl && !isShortUrl) {
      logger.error('Invalid YouTube URL format');
      return { isValid: false, error: 'Invalid YouTube URL format' };
    }

    const hasValidCookies = await this.validateCookiesFile();
    if (!hasValidCookies) {
      logger.error('Cookies file is missing or empty');
      return { isValid: false, error: 'Cookies file is missing or empty' };
    }

    let tempCookiesPath = '';
    try {
      tempCookiesPath = await this.getWritableCookiesPath();
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
      // Enhanced error detection
      if (stderr) {
        if (/Sign in to confirm you.?re not a bot|authentication/i.test(stderr)) {
          return { isValid: false, error: 'YouTube authentication required or cookies are invalid. Please update cookies.' };
        }
        if (/This video is private|Private video/.test(stderr)) {
          return { isValid: false, error: 'This video is private' };
        }
        if (/This video is not available|Video unavailable/.test(stderr)) {
          // Map to region-locked, unavailable, or rate-limited
          if (/region|country|blocked/i.test(stderr)) {
            return { isValid: false, error: 'This video is region-locked or blocked' };
          }
          if (/429|rate limit|too many requests/i.test(stderr)) {
            return { isValid: false, error: 'YouTube rate limit reached, try again later' };
          }
          return { isValid: false, error: 'This video is unavailable' };
        }
        if (/HTTP Error 429|Too Many Requests|rate limit/i.test(stderr)) {
          return { isValid: false, error: 'YouTube rate limit reached, try again later' };
        }
      }
      const videoInfo = JSON.parse(stdout);
      if (!videoInfo || !videoInfo.id) {
        logger.error('Failed to extract video information');
        return { isValid: false, error: 'Failed to extract video information' };
      }
      return {
        isValid: true,
        videoInfo: {
          id: videoInfo.id,
          title: videoInfo.title,
          duration: videoInfo.duration,
          thumbnail: videoInfo.thumbnail
        }
      };
    } catch (error) {
      logger.error('URL validation failed:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      if (tempCookiesPath) await this.cleanupTempFile(tempCookiesPath);
    }
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
        const ytDlp = spawn('yt-dlp', args);
        let errorOutput = '';
        let stdoutOutput = '';
        ytDlp.stdout.on('data', (data) => {
          const output = data.toString();
          stdoutOutput += output;
          logger.info(`yt-dlp stdout: ${output.trim()}`);
        });
        ytDlp.stderr.on('data', (data) => {
          const output = data.toString();
          errorOutput += output;
          logger.error(`yt-dlp stderr: ${output.trim()}`);
        });
        ytDlp.on('close', async (code) => {
          logger.info(`yt-dlp process exited with code ${code}`);
          logger.info(`yt-dlp stdout: ${stdoutOutput}`);
          logger.error(`yt-dlp stderr: ${errorOutput}`);
          await this.cleanupTempFile(tempCookiesPath);
          if (code === 0) {
            try {
              const stats = await fs.stat(outputPath);
              if (stats.size === 0) {
                throw new Error('Downloaded file is empty');
              }
              logger.info(`YouTube video downloaded successfully to ${outputPath}`);
              resolve(outputPath);
            } catch (error) {
              logger.error('Failed to verify downloaded file:', error);
              reject(new AppError('Failed to verify downloaded video', 500));
            }
          } else {
            reject(new AppError(`Failed to download YouTube video: ${errorOutput}`, 500));
          }
        });
        ytDlp.on('error', async (error) => {
          await this.cleanupTempFile(tempCookiesPath);
          reject(error);
        });
      } catch (error) {
        if (tempCookiesPath) await this.cleanupTempFile(tempCookiesPath);
        reject(error);
      }
    });
  }

  async getVideoInfo(url: string): Promise<{
    title: string;
    duration: number;
    thumbnail: string;
  }> {
    await this.checkYtDlp().catch(error => {
      logger.error('yt-dlp check failed:', error);
      throw new AppError('yt-dlp is not properly installed', 500);
    });

    await this.validateCookiesFile();

    return new Promise((resolve, reject) => {
      const baseArgs = [
        url,
        '--skip-download',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificate',
        '--dump-json'
      ];

      const args = [
        ...baseArgs,
        '--cookies', this.cookiesPath,
        '--no-cache-dir',
        '--no-write-playlist-metafiles'
      ];
      logger.info(`Getting video info with yt-dlp: ${url}`);
      logger.info(`Running yt-dlp with args: ${args.join(' ')}`);

      const ytDlp = spawn('yt-dlp', args);

      let output = '';
      let error = '';

      ytDlp.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.info(`yt-dlp stdout: ${chunk.trim()}`);
      });

      ytDlp.stderr.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        logger.error(`yt-dlp stderr: ${chunk.trim()}`);
      });

      ytDlp.on('close', (code) => {
        logger.info(`yt-dlp info process exited with code ${code}`);
        logger.info(`yt-dlp stdout: ${output}`);
        logger.error(`yt-dlp stderr: ${error}`);

        if (code === 0 && output) {
          try {
            const info = JSON.parse(output);
            resolve({
              title: info.title,
              duration: info.duration,
              thumbnail: info.thumbnail
            });
          } catch (error) {
            logger.error('Failed to parse video info:', error);
            reject(new AppError('Failed to get video information', 500));
          }
        } else {
          logger.error(`Failed to get video info: ${error}`);
          reject(new AppError('Failed to get video information', 500));
        }
      });

      ytDlp.on('error', (error) => {
        logger.error('yt-dlp error:', error);
        reject(new AppError('Failed to start yt-dlp process', 500));
      });
    });
  }
} 