import { Router } from 'express';
import { TestController } from '../controllers/test.controller';
import { UploadService } from '../services/upload.service';
import logger from '../utils/logger';

const router = Router();
const testController = new TestController();
const uploadService = new UploadService();

router.get('/dependencies', testController.testDependencies.bind(testController));
router.get('/ping', (req, res) => res.send('pong'));

// Manually trigger file cleanup
router.post('/cleanup', async (req, res) => {
  logger.info('Manual cleanup triggered');
  try {
    await uploadService.cleanupOldFiles(7);
    logger.info('Cleanup completed successfully');
    res.status(200).json({ 
      status: 'success',
      message: 'File cleanup triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    logger.error('Cleanup failed:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        status: 'error',
        error: 'Failed to trigger file cleanup', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        status: 'error',
        error: 'Failed to trigger file cleanup', 
        message: 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
});

console.log('Test router loaded');

export default router; 