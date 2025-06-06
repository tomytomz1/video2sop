import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      trackUserBehavior?: (action: string, metadata?: any) => Promise<void>;
      trackPerformance?: (metric: string, value: number) => Promise<void>;
    }
  }
} 