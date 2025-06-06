import express, { Router } from 'express';
import { ShareableService } from '../services/shareable.service';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { authenticate, isAuthenticatedUser } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { Request } from 'express';
import { createShareableLinkSchema } from '../schemas/shareable.schema';
import { User } from '@prisma/client';

const router = Router();
const shareableService = new ShareableService();

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Schema for creating access token
const createAccessTokenSchema = z.object({
  name: z.string().min(1).max(100),
  expiresIn: z.number().min(1).max(720).optional(), // 1 hour to 30 days
  permissions: z.record(z.boolean()).optional(),
});

// Create shareable link
router.post(
  '/',
  authenticate,
  rateLimitMiddleware,
  validate(createShareableLinkSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const link = await shareableService.createLink(
        req.body.jobId,
        user.id,
        req.body.expiresAt,
        req.body.maxUses
      );
      res.status(201).json(link);
    } catch (error) {
      next(error);
    }
  }
);

// Get shareable link
router.get(
  '/:token',
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const link = await shareableService.getLink(req.params.token);
      if (!link) {
        return res.status(404).json({ error: 'Link not found' });
      }
      res.json(link);
    } catch (error) {
      next(error);
    }
  }
);

// List user's shareable links
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
      const links = await shareableService.listLinks(user.id);
      res.json(links);
    } catch (error) {
      next(error);
    }
  }
);

// Delete shareable link
router.delete(
  '/:token',
  authenticate,
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      await shareableService.deleteLink(req.params.token, user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Create access token
router.post(
  '/tokens',
  authenticate,
  rateLimitMiddleware,
  validate(createAccessTokenSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const { name, expiresIn, permissions } = req.body;
      const token = await shareableService.createAccessToken(user.id, {
        name,
        expiresIn,
        permissions,
      });
      res.json({ status: 'success', data: token });
    } catch (error) {
      next(error);
    }
  }
);

// List access tokens
router.get(
  '/tokens',
  authenticate,
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      const tokens = await shareableService.listAccessTokens(user.id);
      res.json({ status: 'success', data: tokens });
    } catch (error) {
      next(error);
    }
  }
);

// Revoke access token
router.delete(
  '/tokens/:id',
  authenticate,
  rateLimitMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isAuthenticatedUser(req.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = req.user;
      await shareableService.revokeAccessToken(req.params.id, user.id);
      res.json({ status: 'success', message: 'Token revoked successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 