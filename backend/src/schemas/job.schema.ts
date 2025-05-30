import { z } from 'zod';

// Schema for creating a new job
export const createJobSchema = z.object({
  body: z.object({
    videoUrl: z.string().url('Invalid video URL'),
    metadata: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      duration: z.number().optional(),
      format: z.string().optional(),
    }).optional(),
  }),
});

// Schema for getting a job by ID
export const getJobSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
});

// Schema for updating a job
export const updateJobSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
  body: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    resultUrl: z.string().url('Invalid result URL').optional(),
    error: z.string().optional(),
    screenshots: z.array(z.string().url('Invalid screenshot URL')).optional(),
    transcript: z.string().optional(),
    sop: z.string().optional(),
  }),
});

// Schema for listing jobs
export const listJobsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
}); 