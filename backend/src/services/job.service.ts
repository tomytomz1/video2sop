import { PrismaClient, Job, JobType as PrismaJobType } from '@prisma/client';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobType = 'FILE' | 'YOUTUBE';

export interface JobMetadata {
  duration?: number;
  format?: string;
  resolution?: string;
  size?: number;
  audioPath?: string;
  [key: string]: any;
}

export class JobService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createJob(videoUrl: string, type: JobType): Promise<{ id: string }> {
    try {
      const job = await this.prisma.job.create({
        data: {
          videoUrl,
          type: type as PrismaJobType,
          status: 'PENDING',
          metadata: {}
        }
      });
      logger.info(`Created new job with ID: ${job.id}`);
      return { id: job.id };
    } catch (error) {
      logger.error('Failed to create job:', error);
      throw new AppError('Failed to create job', 500);
    }
  }

  async updateJobStatus(jobId: string, status: JobStatus, error?: string): Promise<void> {
    try {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status,
          error: error || null,
          updatedAt: new Date()
        }
      });
      logger.info(`Updated job ${jobId} status to ${status}`);
    } catch (error) {
      logger.error(`Failed to update job ${jobId} status:`, error);
      throw new AppError('Failed to update job status', 500);
    }
  }

  async updateJobMetadata(jobId: string, metadata: JobMetadata): Promise<void> {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        throw new AppError('Job not found', 404);
      }

      const currentMetadata = job.metadata as JobMetadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        ...metadata
      };

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          metadata: updatedMetadata,
          updatedAt: new Date()
        }
      });
      logger.info(`Updated job ${jobId} metadata`);
    } catch (error) {
      logger.error(`Failed to update job ${jobId} metadata:`, error);
      throw new AppError('Failed to update job metadata', 500);
    }
  }

  async getJob(jobId: string): Promise<Job> {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        throw new AppError('Job not found', 404);
      }

      return job;
    } catch (error) {
      logger.error(`Failed to get job ${jobId}:`, error);
      throw new AppError('Failed to get job', 500);
    }
  }

  async listJobs(): Promise<Job[]> {
    try {
      return await this.prisma.job.findMany({
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