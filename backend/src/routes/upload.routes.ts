import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { validate } from '../middleware/validation';
import { youtubeUrlSchema } from '../schemas/upload.schema';

const router = Router();
const uploadController = new UploadController();

// File upload route
router.post(
  '/file',
  uploadController.uploadVideo,
  uploadController.handleVideoUpload
);

// YouTube URL route
router.post(
  '/youtube',
  validate(youtubeUrlSchema),
  uploadController.handleYouTubeUrl
);

export default router; 