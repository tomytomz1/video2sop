import { PrismaClient, Job } from '@prisma/client';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

export class JobService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createJob(videoUrl: string, type: 'file' | 'youtube'): Promise<Job> {
    try {
      const job = await this.prisma.job.create({
        data: {
          videoUrl,
          type: type === 'file' ? 'FILE' : 'YOUTUBE',
          status: 'PENDING',
        },
      });
      logger.info(`Created new job with ID: ${job.id}`);
      return job;
    } catch (error) {
      logger.error('Error creating job:', error);
      throw new AppError('Failed to create job', 500);
    }
  }

  async getJob(id: string): Promise<Job | null> {
    try {
      return await this.prisma.job.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(`Error getting job ${id}:`, error);
      throw new AppError('Failed to get job', 500);
    }
  }

  async getJobs(): Promise<Job[]> {
    try {
      return await this.prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting jobs:', error);
      throw new AppError('Failed to get jobs', 500);
    }
  }

  async updateJobStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    resultUrl?: string,
    error?: string
  ): Promise<Job> {
    try {
      return await this.prisma.job.update({
        where: { id },
        data: {
          status,
          resultUrl,
          error,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Error updating job ${id}:`, error);
      throw new AppError('Failed to update job status', 500);
    }
  }

  async deleteJob(id: string): Promise<void> {
    try {
      await this.prisma.job.delete({
        where: { id },
      });
      logger.info(`Deleted job ${id}`);
    } catch (error) {
      logger.error(`Error deleting job ${id}:`, error);
      throw new AppError('Failed to delete job', 500);
    }
  }
} 