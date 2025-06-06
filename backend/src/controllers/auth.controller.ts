import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { validateEnv } from '../utils/env';

const prisma = new PrismaClient();
const env = validateEnv();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ status: 'error', message: 'Email already registered' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, password: hashed } });
      res.status(201).json({ status: 'success', user: { id: user.id, email: user.email } });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      res.json({ status: 'success', token });
    } catch (err) {
      next(err);
    }
  }
} 