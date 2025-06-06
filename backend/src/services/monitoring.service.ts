import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { validateEnv } from '../utils/env';

const env = validateEnv();

export class MonitoringService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async trackApiUsage(
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): Promise<void> {
    try {
      await this.prisma.apiUsage.create({
        data: {
          userId,
          endpoint,
          method,
          statusCode,
          duration,
        },
      });
    } catch (error) {
      logger.error('Failed to track API usage:', error);
    }
  }

  async trackError(
    userId: string | null,
    error: Error,
    context: {
      endpoint?: string;
      method?: string;
      requestId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      await this.prisma.errorLog.create({
        data: {
          userId,
          message: error.message,
          stack: error.stack || '',
          endpoint: context.endpoint,
          method: context.method,
          requestId: context.requestId,
          metadata: context.metadata || {},
        },
      });
    } catch (error) {
      logger.error('Failed to track error:', error);
    }
  }

  async trackPerformance(
    metric: string,
    value: number,
    tags: Record<string, string> = {}
  ): Promise<void> {
    try {
      await this.prisma.performanceMetric.create({
        data: {
          metric,
          value,
          tags,
        },
      });
    } catch (error) {
      logger.error('Failed to track performance metric:', error);
    }
  }

  async trackUserBehavior(
    userId: string,
    action: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.prisma.userBehavior.create({
        data: {
          userId,
          action,
          metadata,
        },
      });
    } catch (error) {
      logger.error('Failed to track user behavior:', error);
    }
  }

  async getApiUsageStats(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      endpoint?: string;
    } = {}
  ) {
    const { startDate, endDate, userId, endpoint } = options;

    const where = {
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
      ...(userId && { userId }),
      ...(endpoint && { endpoint }),
    };

    const [total, success, failed] = await Promise.all([
      this.prisma.apiUsage.count({ where }),
      this.prisma.apiUsage.count({
        where: { ...where, statusCode: { lt: 400 } },
      }),
      this.prisma.apiUsage.count({
        where: { ...where, statusCode: { gte: 400 } },
      }),
    ]);

    const avgDuration = await this.prisma.apiUsage.aggregate({
      where,
      _avg: { duration: true },
    });

    return {
      total,
      success,
      failed,
      successRate: total > 0 ? (success / total) * 100 : 0,
      avgDuration: avgDuration._avg.duration || 0,
    };
  }

  async getErrorStats(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      endpoint?: string;
    } = {}
  ) {
    const { startDate, endDate, userId, endpoint } = options;

    const where = {
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
      ...(userId && { userId }),
      ...(endpoint && { endpoint }),
    };

    const [total, byEndpoint] = await Promise.all([
      this.prisma.errorLog.count({ where }),
      this.prisma.errorLog.groupBy({
        by: ['endpoint'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byEndpoint: byEndpoint.map((item) => ({
        endpoint: item.endpoint,
        count: item._count,
      })),
    };
  }

  async getPerformanceStats(
    options: {
      startDate?: Date;
      endDate?: Date;
      metric?: string;
    } = {}
  ) {
    const { startDate, endDate, metric } = options;

    const where = {
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
      ...(metric && { metric }),
    };

    const stats = await this.prisma.performanceMetric.groupBy({
      by: ['metric'],
      where,
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
    });

    return stats.map((stat) => ({
      metric: stat.metric,
      avg: stat._avg.value,
      min: stat._min.value,
      max: stat._max.value,
    }));
  }

  async getUserBehaviorStats(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      action?: string;
    } = {}
  ) {
    const { startDate, endDate, userId, action } = options;

    const where = {
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
      ...(userId && { userId }),
      ...(action && { action }),
    };

    const [total, byAction] = await Promise.all([
      this.prisma.userBehavior.count({ where }),
      this.prisma.userBehavior.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
    };
  }

  async cleanupOldData(): Promise<void> {
    const retentionDays = env.METRICS_RETENTION_DAYS || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      await Promise.all([
        this.prisma.apiUsage.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        }),
        this.prisma.errorLog.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        }),
        this.prisma.performanceMetric.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        }),
        this.prisma.userBehavior.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        }),
      ]);

      logger.info(`Cleaned up metrics data older than ${retentionDays} days`);
    } catch (error) {
      logger.error('Failed to cleanup old metrics data:', error);
    }
  }
} 