import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from './error';
import { validateEnv } from '../utils/env';

const prisma = new PrismaClient();
const env = validateEnv();

export function isAuthenticatedUser(user: unknown): user is User {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof (user as User).id === 'string' &&
    'email' in user &&
    typeof (user as User).email === 'string' &&
    'role' in user &&
    typeof (user as User).role === 'string'
  );
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !isAuthenticatedUser(req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get admin token from request header
    const adminToken = req.headers['x-admin-token'];
    
    // Check if admin token is provided and matches environment variable
    if (!adminToken || adminToken !== env.ADMIN_TOKEN) {
      throw new AppError('Unauthorized access', 401);
    }
    
    next();
  } catch (error) {
    next(error);
  }
}; 