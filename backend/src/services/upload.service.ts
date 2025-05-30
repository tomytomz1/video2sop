import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // 100MB default
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

export class UploadService {
  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
      throw new AppError(500, 'Failed to initialize upload directory');
    }
  }

  async saveVideoFile(file: Express.Multer.File): Promise<string> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(400, `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      throw new AppError(400, 'Invalid file type. Only MP4, MOV, AVI, and MKV files are allowed');
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
      await pipeline(file.stream, createWriteStream(filepath));
      logger.info(`File saved successfully: ${filename}`);
      return filepath;
    } catch (error) {
      logger.error('Failed to save file:', error);
      throw new AppError(500, 'Failed to save uploaded file');
    }
  }

  async validateYouTubeUrl(url: string): Promise<boolean> {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  }
} 