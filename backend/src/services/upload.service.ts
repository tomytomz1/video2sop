import { createWriteStream, createReadStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // 100MB default
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed');

export class UploadService {
  constructor() {
    this.ensureUploadDirs();
  }

  private async ensureUploadDirs(): Promise<void> {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await mkdir(TEMP_DIR, { recursive: true });
      await mkdir(PROCESSED_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
      throw new AppError('Failed to initialize upload directories', 500);
    }
  }

  async saveVideoFile(file: Express.Multer.File): Promise<string> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(`File size exceeds maximum limit of ${(MAX_FILE_SIZE / (1024 * 1024)).toString()}MB`, 400);
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      throw new AppError('Invalid file type. Only MP4, MOV, AVI, and MKV files are allowed', 400);
    }

    // Generate secure filename
    const fileExtension = path.extname(file.originalname);
    const secureFilename = `${uuidv4()}${fileExtension}`;
    const tempPath = path.join(TEMP_DIR, secureFilename);
    const finalPath = path.join(PROCESSED_DIR, secureFilename);

    try {
      // Save to temp directory first
      await pipeline(file.stream, createWriteStream(tempPath));
      logger.info(`File saved to temp directory: ${secureFilename}`);

      // Move to processed directory
      await pipeline(
        createReadStream(tempPath),
        createWriteStream(finalPath)
      );
      await unlink(tempPath); // Clean up temp file
      
      logger.info(`File moved to processed directory: ${secureFilename}`);
      return finalPath;
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await unlink(tempPath);
      } catch (cleanupError) {
        logger.error('Failed to clean up temp file:', cleanupError);
      }
      
      logger.error('Failed to save file:', error);
      throw new AppError('Failed to save uploaded file', 500);
    }
  }

  async validateYouTubeUrl(url: string): Promise<boolean> {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  }

  async cleanupFile(filepath: string): Promise<void> {
    try {
      await unlink(filepath);
      logger.info(`Cleaned up file: ${filepath}`);
    } catch (error) {
      logger.error(`Failed to clean up file ${filepath}:`, error);
      throw new AppError('Failed to clean up file', 500);
    }
  }
}