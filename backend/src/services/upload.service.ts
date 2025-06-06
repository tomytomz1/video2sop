import { createWriteStream, createReadStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { detectVideoFileType } from '../utils/videoProcessor';
import { Readable } from 'stream';
import { encryptFile } from '../utils/encryption';

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
      // Support both disk and memory storage
      let inputStream;
      if (file.stream) {
        inputStream = file.stream;
      } else if (file.buffer) {
        inputStream = Readable.from(file.buffer);
      } else {
        throw new AppError('No file stream or buffer found', 400);
      }
      // Save to temp directory first
      await pipeline(inputStream, createWriteStream(tempPath, { mode: 0o600 }));
      logger.info(`File saved to temp directory: ${secureFilename}`);

      // TODO: Encrypt file at rest here for enhanced security (future enhancement)

      // Magic bytes validation
      const detectedType = await detectVideoFileType(tempPath);
      if (!detectedType || !ALLOWED_VIDEO_TYPES.includes(detectedType)) {
        await unlink(tempPath);
        throw new AppError('File signature does not match allowed video types (MP4, MOV, AVI, MKV)', 400);
      }

      // Encrypt and move to processed directory
      await encryptFile(tempPath, finalPath);
      await unlink(tempPath); // Clean up temp file
      logger.info(`File encrypted and moved to processed directory: ${secureFilename}`);
      return finalPath;
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await unlink(tempPath);
      } catch (cleanupError) {
        logger.error('Failed to clean up temp file:', cleanupError);
      }
      // Rethrow AppError as-is, otherwise wrap
      if (error instanceof AppError) {
        throw error;
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

  async cleanupOldFiles(daysOld?: number): Promise<void> {
    const expirationDays = daysOld ?? (Number(process.env.FILE_EXPIRATION_DAYS) || 7);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - expirationDays);

    try {
      const files = await fs.readdir(PROCESSED_DIR);
      for (const file of files) {
        const filePath = path.join(PROCESSED_DIR, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime < cutoffDate) {
          await this.cleanupFile(filePath);
        }
      }
      logger.info(`Cleaned up files older than ${expirationDays} days`);
    } catch (error) {
      logger.error('Failed to clean up old files:', error);
      throw new AppError('Failed to clean up old files', 500);
    }
  }
}