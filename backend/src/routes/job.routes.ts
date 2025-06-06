import { Router } from 'express';
import { validate } from '../middleware/validation';
import {
  createJobSchema,
  getJobSchema,
  updateJobSchema,
  listJobsSchema,
} from '../schemas/job.schema';
import { JobController } from '../controllers/job.controller';
import { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const router = Router();
const jobController = new JobController();

// Placeholder authentication middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => { /* TODO: implement real auth */ next(); };

// Create a new job
router.post(
  '/',
  validate(createJobSchema),
  jobController.createJob
);

// Get a job by ID
router.get(
  '/:id',
  validate(getJobSchema),
  jobController.getJob
);

// Update a job
router.patch(
  '/:id',
  validate(updateJobSchema),
  jobController.updateJob
);

// List jobs with filtering and pagination
router.get(
  '/',
  validate(listJobsSchema),
  jobController.listJobs
);

// Download job PDF (authenticated)
router.get(
  '/:id/export/pdf',
  requireAuth,
  rateLimitMiddleware,
  (req, res, next) => {
    const jobController = new JobController();
    return jobController.downloadPDF(req, res, next);
  }
);

// Download job Markdown (authenticated)
router.get(
  '/:id/export/markdown',
  requireAuth,
  rateLimitMiddleware,
  (req, res, next) => {
    const jobController = new JobController();
    return jobController.downloadMarkdown(req, res, next);
  }
);

// Download job embedded image (authenticated)
router.get(
  '/:id/export/image',
  requireAuth,
  rateLimitMiddleware,
  (req, res, next) => {
    const jobController = new JobController();
    return jobController.downloadImage(req, res, next);
  }
);

export default router; 