import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateJobInput {
  videoUrl: string;
  type: 'file' | 'youtube';
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
        type: input.type,
        status: 'PENDING',
        screenshots: [],
        metadata: input.metadata || {
          type: input.type,
          originalUrl: input.videoUrl,
        },
      }
    });
  }

  async updateJobStatus(id: string, status: string, resultUrl?: string, error?: string) {
    return prisma.job.update({
      where: { id },
      data: {
        status,
        resultUrl,
        error,
        metadata: {
          update: {
            status,
            lastUpdated: new Date().toISOString(),
          }
        }
      }
    });
  }
} 