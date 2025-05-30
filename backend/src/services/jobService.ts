import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateJobInput {
  videoUrl: string;
  type?: string;
  metadata?: any;
}

export class JobService {
  async getAllJobs() {
    return prisma.job.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getJobById(id: string) {
    return prisma.job.findUnique({
      where: { id }
    });
  }

  async createJob(input: CreateJobInput) {
    return prisma.job.create({
      data: {
        videoUrl: input.videoUrl,
        type: input.type || 'file',
        status: 'PENDING',
        screenshots: [],
        metadata: input.metadata || {},
      }
    });
  }

  async updateJobStatus(id: string, status: string, resultUrl?: string, error?: string) {
    return prisma.job.update({
      where: { id },
      data: {
        status,
        resultUrl,
        error
      }
    });
  }
} 