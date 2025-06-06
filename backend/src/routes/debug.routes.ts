import { Router } from 'express';
import { DebugController } from '../controllers/debug.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();
const debugController = new DebugController();

// Protected debug routes - only accessible by admin users
router.get('/env', isAdmin, debugController.getEnvKeys.bind(debugController));
router.get('/status', isAdmin, debugController.getStatus.bind(debugController));

export default router; 