import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.service';
import { VideoWorker } from '../workers/videoWorker';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import fs from 'fs/promises';
import { decryptFile } from '../utils/encryption';
import os from 'os';

export class JobController {
  private jobService: JobService;
  private videoWorker: VideoWorker;

  constructor() {
    this.jobService = new JobService();
    this.videoWorker = new VideoWorker();
  }

  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { videoUrl, type, webhookUrl } = req.body;

      if (!videoUrl) {
        throw new AppError('Video URL is required', 400);
      }

      if (!type || !['file', 'youtube'].includes(type)) {
        throw new AppError('Type must be either "file" or "youtube"', 400);
      }

      // Determine userId or sessionId
      const userId = (req as any).user?.userId;
      const sessionId = (req as any).sessionId;

      // Create job in database
      const job = await this.jobService.createJob(videoUrl, type, webhookUrl, userId, sessionId);
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
      const { status, error: errorMessage } = req.body;

      await this.jobService.updateJobStatus(id, status, errorMessage);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const jobs = await this.jobService.listJobs();
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

  async downloadPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const job = await this.jobService.getJob(id);
      if (!job) {
        throw new AppError('Job not found', 404);
      }
      // Ownership check
      const userId = (req as any).user?.userId;
      const sessionId = (req as any).sessionId;
      if ((job.userId && job.userId !== userId) || (job.sessionId && job.sessionId !== sessionId)) {
        return res.status(403).json({ status: 'error', message: 'Forbidden: not your job' });
      }
      let pdfPath: string | undefined;
      if (job.metadata && typeof job.metadata === 'object' && 'pdfPath' in job.metadata) {
        pdfPath = (job.metadata as any).pdfPath;
      }
      if (!pdfPath) {
        throw new AppError('PDF not available for this job', 404);
      }
      try {
        await fs.access(pdfPath);
        // Decrypt to temp location
        const tempDecrypted = os.tmpdir() + '/' + id + '-decrypted.pdf';
        await decryptFile(pdfPath, tempDecrypted);
        res.download(tempDecrypted, `${id}.pdf`, (err) => {
          fs.unlink(tempDecrypted).catch(() => {});
          if (err) {
            next(new AppError('Failed to download PDF', 500));
          }
        });
      } catch {
        throw new AppError('PDF file is gone or deleted', 410);
      }
    } catch (error) {
      next(error);
    }
  }

  async downloadMarkdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const job = await this.jobService.getJob(id);
      if (!job) {
        throw new AppError('Job not found', 404);
      }
      // Ownership check
      const userId = (req as any).user?.userId;
      const sessionId = (req as any).sessionId;
      if ((job.userId && job.userId !== userId) || (job.sessionId && job.sessionId !== sessionId)) {
        return res.status(403).json({ status: 'error', message: 'Forbidden: not your job' });
      }
      let mdPath: string | undefined;
      if (job.metadata && typeof job.metadata === 'object' && 'markdownPath' in job.metadata) {
        mdPath = (job.metadata as any).markdownPath;
      }
      if (!mdPath) {
        throw new AppError('Markdown not available for this job', 404);
      }
      try {
        await fs.access(mdPath);
        // Decrypt to temp location
        const tempDecrypted = os.tmpdir() + '/' + id + '-decrypted.md';
        await decryptFile(mdPath, tempDecrypted);
        res.download(tempDecrypted, `${id}.md`, (err) => {
          fs.unlink(tempDecrypted).catch(() => {});
          if (err) {
            next(new AppError('Failed to download Markdown', 500));
          }
        });
      } catch {
        throw new AppError('Markdown file is gone or deleted', 410);
      }
    } catch (error) {
      next(error);
    }
  }

  async downloadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const job = await this.jobService.getJob(id);
      if (!job) {
        throw new AppError('Job not found', 404);
      }
      // Ownership check
      const userId = (req as any).user?.userId;
      const sessionId = (req as any).sessionId;
      if ((job.userId && job.userId !== userId) || (job.sessionId && job.sessionId !== sessionId)) {
        return res.status(403).json({ status: 'error', message: 'Forbidden: not your job' });
      }
      let imagePath: string | undefined;
      if (job.metadata && typeof job.metadata === 'object' && 'imagePath' in job.metadata) {
        imagePath = (job.metadata as any).imagePath;
      }
      if (!imagePath) {
        throw new AppError('Embedded image not available for this job', 404);
      }
      try {
        await fs.access(imagePath);
        // Decrypt to temp location
        const tempDecrypted = os.tmpdir() + '/' + id + '-decrypted.png';
        await decryptFile(imagePath, tempDecrypted);
        res.download(tempDecrypted, `${id}.png`, (err) => {
          fs.unlink(tempDecrypted).catch(() => {});
          if (err) {
            next(new AppError('Failed to download embedded image', 500));
          }
        });
      } catch {
        throw new AppError('Embedded image file is gone or deleted', 410);
      }
    } catch (error) {
      next(error);
    }
  }
}