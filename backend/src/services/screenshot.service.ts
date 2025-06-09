import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import sharp from 'sharp';
import { validateEnv } from '../utils/env';

const env = validateEnv();

export class ScreenshotService {
  private readonly tempDir: string;
  private readonly outputDir: string;
  private readonly maxScreenshots: number;
  private readonly screenshotInterval: number; // in seconds

  constructor() {
    this.tempDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.outputDir = path.join(this.tempDir, 'screenshots');
    this.maxScreenshots = env.MAX_SCREENSHOTS;
    this.screenshotInterval = env.SCREENSHOT_INTERVAL;
    this.ensureDirs().catch(error => {
      logger.error('Failed to create directories:', error);
    });
  }

  private async ensureDirs(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.info(`Created directories: ${this.tempDir} and ${this.outputDir}`);
    } catch (error) {
      logger.error('Failed to create screenshot directories:', error);
      throw new AppError('Failed to initialize screenshot directories', 500);
    }
  }

  async extractScreenshots(videoPath: string): Promise<string[]> {
    try {
      // Create a unique directory for this video's screenshots
      const screenshotDir = path.join(this.outputDir, uuidv4());
      await fs.mkdir(screenshotDir, { recursive: true });

      // Get video duration
      const duration = await this.getVideoDuration(videoPath);
      
      // Calculate number of screenshots based on duration and interval
      const numScreenshots = Math.min(
        Math.floor(duration / this.screenshotInterval),
        this.maxScreenshots
      );

      // Extract screenshots using FFmpeg
      const screenshots = await this.extractScreenshotsWithFFmpeg(
        videoPath,
        screenshotDir,
        numScreenshots,
        duration
      );

      // Optimize screenshots
      const optimizedScreenshots = await Promise.all(
        screenshots.map(screenshot => this.optimizeScreenshot(screenshot))
      );

      logger.info(`Extracted and optimized ${optimizedScreenshots.length} screenshots`);
      return optimizedScreenshots;
    } catch (error) {
      logger.error('Failed to extract screenshots:', error);
      throw new AppError('Failed to extract screenshots', 500);
    }
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ]);

      let output = '';
      let error = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          resolve(parseFloat(output.trim()));
        } else {
          reject(new Error(`FFprobe failed: ${error}`));
        }
      });
    });
  }

  private async extractScreenshotsWithFFmpeg(
    videoPath: string,
    outputDir: string,
    numScreenshots: number,
    duration: number
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const interval = duration / (numScreenshots + 1);
      const timestamps = Array.from(
        { length: numScreenshots },
        (_, i) => (i + 1) * interval
      );

      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vf', `select='eq(pict_type,I)',setpts=N/FRAME_RATE/TB`,
        '-vsync', 'vfr',
        '-frame_pts', '1',
        '-q:v', '2',
        ...timestamps.flatMap(t => ['-ss', t.toString()]),
        path.join(outputDir, 'screenshot-%d.jpg')
      ]);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          try {
            const files = await fs.readdir(outputDir);
            const screenshots = files
              .filter(file => file.endsWith('.jpg'))
              .map(file => path.join(outputDir, file));
            resolve(screenshots);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`FFmpeg failed: ${error}`));
        }
      });
    });
  }

  private async optimizeScreenshot(screenshotPath: string): Promise<string> {
    const optimizedPath = screenshotPath.replace('.jpg', '-optimized.jpg');
    
    try {
      await sharp(screenshotPath)
        .resize(1280, 720, { // 720p resolution
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 80,
          progressive: true
        })
        .toFile(optimizedPath);

      // Delete original screenshot
      await fs.unlink(screenshotPath);
      
      return optimizedPath;
    } catch (error) {
      logger.error('Failed to optimize screenshot:', error);
      return screenshotPath; // Return original if optimization fails
    }
  }

  async cleanupScreenshots(screenshotPaths: string[]): Promise<void> {
    try {
      await Promise.all(
        screenshotPaths.map(path => 
          fs.unlink(path).catch(err => 
            logger.error(`Failed to delete screenshot ${path}:`, err)
          )
        )
      );
      logger.info('Cleaned up screenshots successfully');
    } catch (error) {
      logger.error('Failed to cleanup screenshots:', error);
    }
  }
} 