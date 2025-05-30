import { Request, Response, NextFunction } from 'express';
import { JobService, JobStatus, JobType } from '../services/job.service';
import { AppError } from '../middleware/error';

export class JobController {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { videoUrl, type = JobType.FILE, metadata } = req.body;

      const job = await this.jobService.createJob({
        videoUrl,
        type,
        metadata,
      });

      return res.status(201).json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async getJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const job = await this.jobService.getJobById(id);

      if (!job) {
        throw new AppError(404, 'Job not found');
      }

      return res.json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, resultUrl, error, screenshots, transcript, sop } = req.body;

      const job = await this.jobService.updateJobStatus(
        id,
        status as JobStatus,
        resultUrl,
        error
      );

      return res.json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const result = await this.jobService.listJobs({
        status: status as JobStatus | undefined,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return res.json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
} 