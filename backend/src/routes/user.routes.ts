import { Router } from 'express';
import { UserService } from '../services/user.service';
import { authenticate } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const userService = new UserService();

// Schema for user update
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
});

// Get current user
router.get(
  '/me',
  authenticate,
  rateLimitMiddleware,
  async (req, res, next) => {
    try {
      const user = await userService.getUserById(req.user!.id);
      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Update current user
router.patch(
  '/me',
  authenticate,
  rateLimitMiddleware,
  validate(updateUserSchema),
  async (req, res, next) => {
    try {
      const { name, email, currentPassword, newPassword } = req.body;
      const user = await userService.updateUser(req.user!.id, {
        name,
        email,
        currentPassword,
        newPassword,
      });
      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Delete current user
router.delete(
  '/me',
  authenticate,
  rateLimitMiddleware,
  async (req, res, next) => {
    try {
      await userService.deleteUser(req.user!.id);
      res.json({
        status: 'success',
        message: 'User account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user API keys
router.get(
  '/me/api-keys',
  authenticate,
  rateLimitMiddleware,
  async (req, res, next) => {
    try {
      const apiKeys = await userService.getUserApiKeys(req.user!.id);
      res.json({ status: 'success', data: apiKeys });
    } catch (error) {
      next(error);
    }
  }
);

// Get user webhooks
router.get(
  '/me/webhooks',
  authenticate,
  rateLimitMiddleware,
  async (req, res, next) => {
    try {
      const webhooks = await userService.getUserWebhooks(req.user!.id);
      res.json({ status: 'success', data: webhooks });
    } catch (error) {
      next(error);
    }
  }
);

// Get user usage statistics
router.get(
  '/me/usage',
  authenticate,
  rateLimitMiddleware,
  async (req, res, next) => {
    try {
      const usage = await userService.getUserUsageStats(req.user!.id);
      res.json({ status: 'success', data: usage });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 