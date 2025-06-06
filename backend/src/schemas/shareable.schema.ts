import { z } from 'zod';

export const createShareableLinkSchema = z.object({
  jobId: z.string().uuid(),
  expiresIn: z.number().min(1).max(720).optional(), // 1 hour to 30 days
  maxUses: z.number().min(1).max(100).optional(),
}); 