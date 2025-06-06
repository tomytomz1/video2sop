import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { validate } from '../middleware/validation';
import { youtubeUrlSchema } from '../schemas/upload.schema';
import { uploadLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/auth';

const router = Router();
const uploadController = new UploadController();

// File upload route
router.post(
  '/file',
  uploadLimiter,
  uploadController.uploadVideo,
  uploadController.handleVideoUpload
);

// YouTube URL route
router.post(
  '/youtube',
  uploadLimiter,
  validate(youtubeUrlSchema),
  uploadController.handleYouTubeUrl
);

export default router; 