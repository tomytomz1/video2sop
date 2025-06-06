import { Request, Response, NextFunction } from 'express';
import { validateEnv } from '../utils/env';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { VideoWorker } from '../workers/videoWorker';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const env = validateEnv();

export class DebugController {
  private readonly videoWorker: VideoWorker;

  constructor() {
    this.videoWorker = new VideoWorker();
  }

  async getEnvKeys(req: Request, res: Response, next: NextFunction) {
    try {
      // Only return environment variable keys, not values
      const envKeys = Object.keys(process.env).sort();
      res.json({
        status: 'success',
        data: {
          keys: envKeys,
          count: envKeys.length
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Check database connection
      const dbStatus = await this.checkDatabase();
      
      // Check Redis connection
      const redisStatus = await this.checkRedis();
      
      // Get queue stats
      const queueStats = await this.getQueueStats();
      
      // Get app version and uptime
      const appInfo = this.getAppInfo();

      res.json({
        status: 'success',
        data: {
          timestamp: new Date().toISOString(),
          app: appInfo,
          database: dbStatus,
          redis: redisStatus,
          queue: queueStats
        }
      });
    } catch (err) {
      next(err);
    }
  }

  private async checkDatabase() {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        version: await this.getDatabaseVersion()
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkRedis() {
    try {
      const redis = createClient({ url: env.REDIS_URL });
      
      const startTime = Date.now();
      await redis.ping();
      const responseTime = Date.now() - startTime;
      
      await redis.quit();

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getQueueStats() {
    try {
      const queue = this.videoWorker['queue'];
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount()
      ]);

      return {
        status: 'healthy',
        stats: {
          waiting,
          active,
          completed,
          failed
        }
      };
    } catch (error) {
      logger.error('Queue stats check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getAppInfo() {
    return {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      environment: env.NODE_ENV,
      uptime: process.uptime()
    };
  }

  private async getDatabaseVersion() {
    try {
      const result = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
      return result[0]?.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }
} 