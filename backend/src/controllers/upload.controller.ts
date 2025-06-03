import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { UploadService } from '../services/upload.service';
import { JobService } from '../services/job.service';
import { AppError } from '../middleware/error';
import { VideoWorker } from '../workers/videoWorker';
import logger from '../utils/logger';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
  },
});

// Global worker instance (will be set from app.ts)
let videoWorkerInstance: VideoWorker | null = null;

export const setVideoWorkerInstance = (worker: VideoWorker) => {
  videoWorkerInstance = worker;
  logger.info('VideoWorker instance set in UploadController');
};

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
        throw new AppError('No video file provided', 400);
      }

      const filepath: string = await this.uploadService.saveVideoFile(req.file);
      // Create a new job for video processing
      const job = await this.jobService.createJob(filepath, 'file');

      // Add job to processing queue
      if (videoWorkerInstance) {
        await videoWorkerInstance.addJob({
          jobId: job.id,
          videoUrl: filepath,
          type: 'file'
        });
        logger.info(`Added file processing job to queue: ${job.id}`);
      } else {
        logger.error('VideoWorker not initialized - job will remain in PENDING status');
      }

      res.status(201).json({
        status: 'success',
        data: {
          jobId: job.id,
          message: 'Video uploaded successfully and processing started',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  handleYouTubeUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url }: { url: string } = req.body;

      if (!url) {
        throw new AppError('YouTube URL is required', 400);
      }

      const isValid = await this.uploadService.validateYouTubeUrl(url);
      if (!isValid) {
        throw new AppError('Invalid YouTube URL', 400);
      }

      // Create a new job for YouTube video processing
      const job = await this.jobService.createJob(url, 'youtube');

      // Add job to processing queue
      if (videoWorkerInstance) {
        await videoWorkerInstance.addJob({
          jobId: job.id,
          videoUrl: url,
          type: 'youtube'
        });
        logger.info(`Added YouTube processing job to queue: ${job.id}`);
      } else {
        logger.error('VideoWorker not initialized - job will remain in PENDING status');
      }

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
