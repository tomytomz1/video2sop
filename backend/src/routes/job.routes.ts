import { Router } from 'express';
import { validate } from '../middleware/validation';
import {
  createJobSchema,
  getJobSchema,
  updateJobSchema,
  listJobsSchema,
} from '../schemas/job.schema';
import { JobController } from '../controllers/job.controller';

const router = Router();
const jobController = new JobController();

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

export default router; 