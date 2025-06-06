import { Router } from 'express';
import { WebhookService } from '../services/webhook.service';
import { authenticate, isAuthenticatedUser } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validate } from '../middleware/validation';
import { createWebhookSchema, updateWebhookSchema } from '../schemas/webhook.schema';
import { User } from '@prisma/client';
import type { Request } from 'express';
import { z } from 'zod';

const router = Router();
const webhookService = new WebhookService();

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Schema for webhook delivery query
const webhookDeliveryQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  status: z.enum(['success', 'failed', 'pending']).optional(),
});

// Create webhook
router.post(
  '/',
  authenticate,
  rateLimitMiddleware,
  validate(createWebhookSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const webhook = await webhookService.createWebhook(
        user.id,
        req.body.url,
        req.body.events,
        req.body.description
      );
      res.status(201).json(webhook);
    } catch (error) {
      next(error);
    }
  }
);

// List webhooks
router.get(
  '/',
  authenticate,
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const webhooks = await webhookService.listWebhooks(user.id);
      res.json(webhooks);
    } catch (error) {
      next(error);
    }
  }
);

// Get webhook
router.get(
  '/:id',
  authenticate,
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const webhook = await webhookService.getWebhook(req.params.id, user.id);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }
      res.json(webhook);
    } catch (error) {
      next(error);
    }
  }
);

// Update webhook
router.put(
  '/:id',
  authenticate,
  rateLimitMiddleware,
  validate(updateWebhookSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const webhook = await webhookService.updateWebhook(
        req.params.id,
        user.id,
        req.body
      );
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }
      res.json(webhook);
    } catch (error) {
      next(error);
    }
  }
);

// Delete webhook
router.delete(
  '/:id',
  authenticate,
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      await webhookService.deleteWebhook(req.params.id, user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Get webhook deliveries
router.get(
  '/:id/deliveries',
  authenticate,
  rateLimitMiddleware,
  validate(webhookDeliveryQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const { limit, offset, status } = req.query;
      const deliveries = await webhookService.getWebhookDeliveries(
        req.params.id,
        user.id,
        {
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
          status: status as string | undefined,
        }
      );
      res.json({ status: 'success', data: deliveries });
    } catch (error) {
      next(error);
    }
  }
);

// Webhook endpoint for external services
router.post(
  '/:id/trigger',
  async (req, res, next) => {
    try {
      const signature = req.headers['x-webhook-signature'];
      const event = req.headers['x-webhook-event'];

      if (!signature || !event) {
        throw new Error('Missing required headers');
      }

      const isValid = await webhookService.validateWebhookSignature(
        req.params.id,
        signature as string,
        JSON.stringify(req.body)
      );

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      await webhookService.triggerWebhook(
        req.params.id,
        event as string,
        req.body
      );

      res.json({ status: 'success', message: 'Webhook triggered successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/test/:id',
  authenticate,
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const webhook = await webhookService.testWebhook(req.params.id, user.id);
      res.json(webhook);
    } catch (error) {
      next(error);
    }
  }
);

export default router; 