import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Magic bytes for video formats
const VIDEO_SIGNATURES = [
  { type: 'video/mp4', bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70] }, // MP4 (common)
  { type: 'video/mp4', bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] }, // MP4 (variation)
  { type: 'video/quicktime', bytes: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74] }, // MOV
  { type: 'video/x-msvideo', bytes: [0x52, 0x49, 0x46, 0x46] }, // AVI (RIFF)
  { type: 'video/x-matroska', bytes: [0x1A, 0x45, 0xDF, 0xA3] }, // MKV
];

/**
 * Reads the first few bytes of a file and returns the detected video type, or null if unknown.
 */
export async function detectVideoFileType(filePath: string): Promise<string | null> {
  const maxLength = Math.max(...VIDEO_SIGNATURES.map(sig => sig.bytes.length));
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(maxLength);
    await fileHandle.read(buffer, 0, maxLength, 0);
    for (const sig of VIDEO_SIGNATURES) {
      if (buffer.slice(0, sig.bytes.length).equals(Buffer.from(sig.bytes))) {
        return sig.type;
      }
    }
    return null;
  } finally {
    await fileHandle.close();
  }
}

export class VideoProcessor {
  private readonly tempDir: string;
  private readonly outputDir: string;
  private readonly maxFileSize: number;

  constructor() {
    this.tempDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.outputDir = path.join(process.cwd(), 'output');
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600', 10); // Default 100MB
  }

  async initialize() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.info('VideoProcessor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize VideoProcessor:', error);
      throw error;
    }
  }

  async downloadVideo(videoUrl: string, type: 'file' | 'youtube'): Promise<string> {
    const videoId = uuidv4();
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`);

    try {
      if (type === 'youtube') {
        await this.downloadYoutubeVideo(videoUrl, outputPath);
      } else {
        await this.downloadFileVideo(videoUrl, outputPath);
      }

      // Check file size
      const stats = await fs.stat(outputPath);
      if (stats.size > this.maxFileSize) {
        await fs.unlink(outputPath);
        throw new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`);
      }

      logger.info(`Video downloaded successfully to ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Failed to download video:', error);
      throw error;
    }
  }

  private async downloadYoutubeVideo(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ytDlp = spawn('yt-dlp', [
        url,
        '-f', 'best[ext=mp4]',
        '-o', outputPath,
        '--no-playlist'
      ]);

      ytDlp.stdout.on('data', (data) => {
        logger.info(`yt-dlp stdout: ${data}`);
      });

      ytDlp.stderr.on('data', (data) => {
        logger.error(`yt-dlp stderr: ${data}`);
      });

      ytDlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp process exited with code ${code}`));
        }
      });
    });
  }

  private async downloadFileVideo(url: string, outputPath: string): Promise<void> {
    // For file URLs, we'll just copy the file
    try {
      await fs.copyFile(url, outputPath);
    } catch (error) {
      logger.error('Failed to copy video file:', error);
      throw error;
    }
  }

  async extractAudio(videoPath: string): Promise<string> {
    const audioId = uuidv4();
    const outputPath = path.join(this.tempDir, `${audioId}.mp3`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vn', // No video
        '-acodec', 'libmp3lame', // Use MP3 codec
        '-q:a', '2', // High quality
        outputPath
      ]);

      ffmpeg.stdout.on('data', (data) => {
        logger.info(`ffmpeg stdout: ${data}`);
      });

      ffmpeg.stderr.on('data', (data) => {
        logger.error(`ffmpeg stderr: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`Audio extracted successfully to ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`ffmpeg process exited with code ${code}`));
        }
      });
    });
  }
}