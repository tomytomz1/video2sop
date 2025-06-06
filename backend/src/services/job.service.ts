import { PrismaClient, Job as PrismaJob, JobType as PrismaJobType } from '@prisma/client';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import fetch from 'node-fetch';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobType = 'FILE' | 'YOUTUBE';

export interface JobMetadata {
  type?: string;
  originalUrl?: string;
  status?: string;
  lastUpdated?: Date;
  downloadProgress?: number;
  processingProgress?: number;
  error?: string;
  pdfPath?: string;
  markdownPath?: string;
  imagePath?: string;
  audioPath?: string;
  title?: string;
  duration?: number;
  screenshots?: string[];
  transcription?: string;
  sop?: string;
  [key: string]: any;
}

export class JobService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createJob(
    videoUrl: string,
    type: JobType,
    webhookUrl?: string,
    userId?: string,
    sessionId?: string
  ): Promise<{ id: string }> {
    try {
      const job = await this.prisma.job.create({
        data: {
          userId: userId || 'anonymous',
          inputPath: videoUrl,
          type: type as PrismaJobType,
          webhookUrl: webhookUrl || null,
          sessionId: sessionId || null,
          metadata: {},
        },
      });
      logger.info(`Created new job with ID: ${job.id}`);
      return { id: job.id };
    } catch (error) {
      logger.error('Failed to create job:', error);
      throw new AppError('Failed to create job', 500);
    }
  }

  async updateJobStatus(id: string, status: string, error?: string): Promise<void> {
    try {
      const job = await this.prisma.job.update({
        where: { id },
        data: {
          status: status as any,
          error: error || null,
          updatedAt: new Date()
        }
      }) as PrismaJob;
      logger.info(`Updated job ${id} status to ${status}`);

      // Webhook notification
      if (job.webhookUrl) {
        const payload = {
          event: 'job.status_changed',
          job: {
            id: job.id,
            status: job.status,
            type: job.type,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            resultUrl: job.resultUrl,
            error: job.error,
            metadata: job.metadata,
            webhookUrl: job.webhookUrl,
          }
        };
        try {
          const resp = await fetch(job.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            logger.error(`Webhook delivery failed for job ${id}: ${resp.status} ${resp.statusText}`);
          } else {
            logger.info(`Webhook delivered for job ${id} to ${job.webhookUrl}`);
          }
        } catch (err) {
          logger.error(`Webhook delivery error for job ${id}:`, err);
        }
      }
    } catch (error) {
      logger.error(`Failed to update job ${id} status:`, error);
      throw new AppError('Failed to update job status', 500);
    }
  }

  async updateJobMetadata(id: string, metadata: Partial<JobMetadata>): Promise<void> {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id },
      });

      if (!job) {
        throw new AppError('Job not found', 404);
      }

      const currentMetadata = (job.metadata as JobMetadata) || {};
      const updatedMetadata = { ...currentMetadata, ...metadata };

      await this.prisma.job.update({
        where: { id },
        data: {
          metadata: updatedMetadata,
          updatedAt: new Date()
        }
      });
      logger.info(`Updated job ${id} metadata`);
    } catch (error) {
      logger.error(`Failed to update job ${id} metadata:`, error);
      throw new AppError('Failed to update job metadata', 500);
    }
  }

  async getJob(id: string): Promise<PrismaJob | null> {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id },
      });

      if (!job) {
        throw new AppError('Job not found', 404);
      }

      return job;
    } catch (error) {
      logger.error(`Failed to get job ${id}:`, error);
      throw new AppError('Failed to get job', 500);
    }
  }

  async listJobs(userId?: string, sessionId?: string): Promise<PrismaJob[]> {
    try {
      const where: any = {};
      if (userId) {
        where.userId = userId;
      }
      if (sessionId) {
        where.sessionId = sessionId;
      }

      return await this.prisma.job.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      logger.error('Failed to list jobs:', error);
      throw new AppError('Failed to list jobs', 500);
    }
  }

  async deleteJob(id: string): Promise<void> {
    try {
      await this.prisma.job.delete({
        where: { id },
      });
      logger.info(`Deleted job with ID: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete job ${id}:`, error);
      throw new AppError('Failed to delete job', 500);
    }
  }
}