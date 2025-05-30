import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum JobType {
  FILE = 'file',
  YOUTUBE = 'youtube'
}

export interface CreateJobInput {
  videoUrl: string;
  type: JobType;
  metadata?: Record<string, any>;
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
        status: JobStatus.PENDING,
        screenshots: [],
        metadata: input.metadata || {
          type: input.type,
          originalUrl: input.videoUrl,
          status: JobStatus.PENDING,
          lastUpdated: new Date().toISOString(),
        },
      }
    });
  }

  async updateJobStatus(id: string, status: JobStatus, resultUrl?: string, error?: string) {
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

  async listJobs(params: {
    status?: JobStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: Prisma.SortOrder;
  }) {
    const { status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = status ? { status } : {};
    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
} 