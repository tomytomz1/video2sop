import { z } from 'zod';

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()),
  description: z.string().optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
}); 