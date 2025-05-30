import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { UploadService } from '../services/upload.service';
import { JobService } from '../services/job.service';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
  },
});

export class UploadController {
  private uploadService: UploadService;
  private jobService: JobService;

  constructor() {
    this.uploadService = new UploadService();
    this.jobService = new JobService();
  }

  uploadVideo = upload.single('video');

  handleVideoUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError(400, 'No video file provided');
      }

      const filepath = await this.uploadService.saveVideoFile(req.file);
      
      // Create a new job for video processing
      const job = await this.jobService.createJob({
        videoUrl: filepath,
        type: 'file',
      });

      res.status(201).json({
        status: 'success',
        data: {
          jobId: job.id,
          message: 'Video uploaded successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  handleYouTubeUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url } = req.body;

      if (!url) {
        throw new AppError(400, 'YouTube URL is required');
      }

      const isValid = await this.uploadService.validateYouTubeUrl(url);
      if (!isValid) {
        throw new AppError(400, 'Invalid YouTube URL');
      }

      // Create a new job for YouTube video processing
      const job = await this.jobService.createJob({
        videoUrl: url,
        type: 'youtube',
      });

      res.status(201).json({
        status: 'success',
        data: {
          jobId: job.id,
          message: 'YouTube video processing started',
        },
      });
    } catch (error) {
      next(error);
    }
  };
} 