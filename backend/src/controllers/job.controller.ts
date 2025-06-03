import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.service';
import { VideoWorker } from '../workers/videoWorker';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

export class JobController {
  private jobService: JobService;
  private videoWorker: VideoWorker;

  constructor() {
    this.jobService = new JobService();
    this.videoWorker = new VideoWorker();
  }

  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { videoUrl, type } = req.body;

      if (!videoUrl) {
        throw new AppError('Video URL is required', 400);
      }

      if (!type || !['file', 'youtube'].includes(type)) {
        throw new AppError('Type must be either "file" or "youtube"', 400);
      }

      // Create job in database
      const job = await this.jobService.createJob(videoUrl, type);
      logger.info(`Created new job with ID: ${job.id}`);

      // Add job to processing queue
      await this.videoWorker.addJob({
        jobId: job.id,
        videoUrl,
        type
      });
      logger.info(`Added job ${job.id} to processing queue`);

      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  }

  async getJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const job = await this.jobService.getJob(id);
      
      if (!job) {
        throw new AppError('Job not found', 404);
      }

      res.json(job);
    } catch (error) {
      next(error);
    }
  }

  async updateJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, resultUrl, error: errorMessage } = req.body;

      const updatedJob = await this.jobService.updateJobStatus(id, status, resultUrl, errorMessage);
      
      if (!updatedJob) {
        throw new AppError('Job not found', 404);
      }

      res.json(updatedJob);
    } catch (error) {
      next(error);
    }
  }

  async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const jobs = await this.jobService.getJobs();
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  }

  async getJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const jobs = await this.jobService.getJobs();
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  }

  async deleteJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await this.jobService.deleteJob(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}