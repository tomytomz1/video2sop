import { Router } from 'express';
import { TestController } from '../controllers/test.controller';

const router = Router();
const testController = new TestController();

router.get('/dependencies', testController.testDependencies.bind(testController));
router.get('/ping', (req, res) => res.send('pong'));
console.log('Test router loaded');

export default router; 