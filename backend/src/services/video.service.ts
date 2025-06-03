import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

export class VideoService {
  private readonly tempDir: string;
  private readonly outputDir: string;

  constructor() {
    this.tempDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.outputDir = path.join(this.tempDir, 'processed');
    this.ensureDirs();
  }

  private async ensureDirs(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create video processing directories:', error);
      throw new AppError('Failed to initialize video processing directories', 500);
    }
  }

  async extractAudio(videoPath: string): Promise<string> {
    const outputPath = path.join(this.outputDir, `${path.basename(videoPath, path.extname(videoPath))}.mp3`);
    
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vn', // No video
        '-acodec', 'libmp3lame', // Use MP3 codec
        '-ar', '44100', // Sample rate
        '-ab', '192k', // Bitrate
        '-y', // Overwrite output file if exists
        outputPath
      ]);

      ffmpeg.stderr.on('data', (data) => {
        logger.debug(`FFmpeg: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`Audio extracted successfully to ${outputPath}`);
          resolve(outputPath);
        } else {
          logger.error(`FFmpeg process exited with code ${code}`);
          reject(new AppError('Failed to extract audio from video', 500));
        }
      });

      ffmpeg.on('error', (error) => {
        logger.error('FFmpeg error:', error);
        reject(new AppError('Failed to start FFmpeg process', 500));
      });
    });
  }

  async getVideoInfo(videoPath: string): Promise<{
    duration: number;
    format: string;
    size: number;
    resolution: string;
  }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration,size,format_name',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
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
          try {
            const info = JSON.parse(output);
            const format = info.format;
            const stream = info.streams[0];

            resolve({
              duration: parseFloat(format.duration),
              format: format.format_name,
              size: parseInt(format.size),
              resolution: `${stream.width}x${stream.height}`
            });
          } catch (error) {
            logger.error('Failed to parse FFprobe output:', error);
            reject(new AppError('Failed to get video information', 500));
          }
        } else {
          logger.error(`FFprobe process exited with code ${code}: ${error}`);
          reject(new AppError('Failed to get video information', 500));
        }
      });

      ffprobe.on('error', (error) => {
        logger.error('FFprobe error:', error);
        reject(new AppError('Failed to start FFprobe process', 500));
      });
    });
  }

  async validateVideo(videoPath: string): Promise<boolean> {
    try {
      await this.getVideoInfo(videoPath);
      return true;
    } catch (error) {
      logger.error('Video validation failed:', error);
      return false;
    }
  }
} 