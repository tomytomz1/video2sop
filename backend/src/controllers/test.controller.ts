import { Request, Response, NextFunction } from 'express';
import { runAllTests } from '../utils/testDependencies';
import logger from '../utils/logger';

export class TestController {
  async testDependencies(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Running dependency tests...');
      const result = await runAllTests();
      
      if (result) {
        res.json({ status: 'success', message: 'All dependency tests passed' });
      } else {
        res.status(500).json({ status: 'error', message: 'Some dependency tests failed' });
      }
    } catch (error) {
      next(error);
    }
  }
} 