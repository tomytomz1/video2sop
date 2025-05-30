import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/error';

const prisma = new PrismaClient();

export class JobController {
  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { videoUrl, type = 'file', metadata } = req.body;

      const job = await prisma.job.create({
        data: {
          videoUrl,
          type,
          metadata: metadata || {},
          status: 'PENDING',
          screenshots: [],
        },
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

      const job = await prisma.job.findUnique({
        where: { id },
      });

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
      const updateData = req.body;

      const job = await prisma.job.update({
        where: { id },
        data: updateData,
      });

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

      const skip = (Number(page) - 1) * Number(limit);

      const where: Prisma.JobWhereInput = status 
        ? { status: status as string }
        : {};

      const orderBy: Prisma.JobOrderByWithRelationInput = {
        [sortBy as string]: sortOrder as Prisma.SortOrder,
      };

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          orderBy,
          skip,
          take: Number(limit),
        }),
        prisma.job.count({ where }),
      ]);

      return res.json({
        status: 'success',
        data: jobs,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
} 