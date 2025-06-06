import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  let sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('sessionId', sessionId, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 30 }); // 30 days
  }
  (req as any).sessionId = sessionId;
  next();
} 