import { z } from 'zod';

export const youtubeUrlSchema = z.object({
  body: z.object({
    url: z.string().url('Invalid URL format'),
  }),
}); 