import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../services/monitoring.service';
import { v4 as uuidv4 } from 'uuid';

const monitoringService = new MonitoringService();

export const monitoringMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Track API usage
  const trackApiUsage = async () => {
    const duration = Date.now() - startTime;
    if (req.user?.id) {
      await monitoringService.trackApiUsage(
        req.user.id,
        req.path,
        req.method,
        res.statusCode,
        duration
      );
    }
  };

  // Track errors
  const trackError = async (error: Error) => {
    await monitoringService.trackError(req.user?.id || null, error, {
      endpoint: req.path,
      method: req.method,
      requestId,
      metadata: {
        query: req.query,
        params: req.params,
        headers: req.headers,
      },
    });
  };

  // Track user behavior
  const trackUserBehavior = async (action: string, metadata: any = {}) => {
    if (req.user?.id) {
      await monitoringService.trackUserBehavior(req.user.id, action, {
        ...metadata,
        requestId,
        endpoint: req.path,
        method: req.method,
      });
    }
  };

  // Add tracking methods to request object
  req.trackUserBehavior = trackUserBehavior;

  // Track response
  const originalJson = res.json;
  res.json = function (body: any) {
    trackApiUsage();
    return originalJson.call(this, body);
  };

  // Track errors
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      trackError(new Error(`HTTP ${res.statusCode}`));
    }
  });

  // Track performance metrics
  const trackPerformance = async (metric: string, value: number) => {
    await monitoringService.trackPerformance(metric, value, {
      endpoint: req.path,
      method: req.method,
      requestId,
    });
  };

  // Add performance tracking to request object
  req.trackPerformance = trackPerformance;

  next();
}; 