import { Router } from 'express';
import { MonitoringService } from '../services/monitoring.service';
import { authenticate } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const monitoringService = new MonitoringService();

// Schema for date range query
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Schema for API usage query
const apiUsageQuerySchema = dateRangeSchema.extend({
  userId: z.string().uuid().optional(),
  endpoint: z.string().optional(),
});

// Schema for error stats query
const errorStatsQuerySchema = dateRangeSchema.extend({
  userId: z.string().uuid().optional(),
  endpoint: z.string().optional(),
});

// Schema for performance stats query
const performanceStatsQuerySchema = dateRangeSchema.extend({
  metric: z.string().optional(),
});

// Schema for user behavior query
const userBehaviorQuerySchema = dateRangeSchema.extend({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
});

// Get API usage statistics
router.get(
  '/api-usage',
  authenticate,
  rateLimitMiddleware,
  validate(apiUsageQuerySchema),
  async (req, res, next) => {
    try {
      const { startDate, endDate, userId, endpoint } = req.query;
      const stats = await monitoringService.getApiUsageStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId as string,
        endpoint: endpoint as string,
      });
      res.json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Get error statistics
router.get(
  '/errors',
  authenticate,
  rateLimitMiddleware,
  validate(errorStatsQuerySchema),
  async (req, res, next) => {
    try {
      const { startDate, endDate, userId, endpoint } = req.query;
      const stats = await monitoringService.getErrorStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId as string,
        endpoint: endpoint as string,
      });
      res.json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Get performance statistics
router.get(
  '/performance',
  authenticate,
  rateLimitMiddleware,
  validate(performanceStatsQuerySchema),
  async (req, res, next) => {
    try {
      const { startDate, endDate, metric } = req.query;
      const stats = await monitoringService.getPerformanceStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        metric: metric as string,
      });
      res.json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Get user behavior statistics
router.get(
  '/user-behavior',
  authenticate,
  rateLimitMiddleware,
  validate(userBehaviorQuerySchema),
  async (req, res, next) => {
    try {
      const { startDate, endDate, userId, action } = req.query;
      const stats = await monitoringService.getUserBehaviorStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId as string,
        action: action as string,
      });
      res.json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Cleanup old monitoring data
router.post(
  '/cleanup',
  authenticate,
  rateLimitMiddleware,
  async (req, res, next) => {
    try {
      await monitoringService.cleanupOldData();
      res.json({
        status: 'success',
        message: 'Old monitoring data cleaned up successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 