import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { createBullBoard } from '@bull-board/api';
import cookieParser from 'cookie-parser';
import { validateEnvironmentVariables } from './utils/validateEnv';
import { validateEnv } from './utils/env';
import testRoutes from './routes/test.routes';
import uploadRoutes from './routes/upload.routes';
import jobRoutes from './routes/job.routes';
import authRoutes from './routes/auth.routes';
import { sessionMiddleware } from './middleware/session';
import { UploadService } from './services/upload.service';
import { VideoWorker } from './workers/videoWorker';
import { AppError } from './middleware/error';
import logger from './utils/logger';
import cron from 'node-cron';
import path from 'path';
import debugRoutes from './routes/debug.routes';
import compression from 'compression';
import { monitoringMiddleware } from './middleware/monitoring';
import userRoutes from './routes/user.routes';
import shareableRoutes from './routes/shareable.routes';
import webhookRoutes from './routes/webhook.routes';
import monitoringRoutes from './routes/monitoring.routes';
import { errorHandler } from './middleware/error';
import { rateLimitErrorHandler } from './middleware/rateLimit';

// Load environment variables
dotenv.config();

// Validate environment variables before starting the app
validateEnvironmentVariables();

const env = validateEnv();
const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", env.CORS_ORIGIN],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW) * 60 * 1000, // Convert minutes to milliseconds
  max: Number(env.RATE_LIMIT_MAX),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for sensitive routes
const sensitiveLimiter = rateLimit({
  windowMs: Number(env.SENSITIVE_RATE_LIMIT_WINDOW) * 60 * 1000, // Convert minutes to milliseconds
  max: Number(env.SENSITIVE_RATE_LIMIT_MAX),
  message: 'Too many requests to sensitive endpoint, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', globalLimiter);
app.use('/api/upload/youtube', sensitiveLimiter);
app.use('/api/auth', sensitiveLimiter);

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-admin-token'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parsing
app.use(cookieParser());

// Session middleware
app.use(sessionMiddleware);

// Monitoring middleware
app.use(monitoringMiddleware);

// Routes
app.use('/api/test', testRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/users', userRoutes);
app.use('/api/share', shareableRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Bull Board setup for queue monitoring
const videoWorker = new VideoWorker();
if (env.NODE_ENV !== 'test') {
  const serverAdapter = new ExpressAdapter();
  createBullBoard({
    queues: [new BullAdapter((videoWorker['queue']) as any)],
    serverAdapter,
  });
  // Mount Bull Board at /admin/queues (add authentication in production!)
  serverAdapter.setBasePath('/admin/queues');
  app.use('/admin/queues', serverAdapter.getRouter());
}

// Error handling
app.use(rateLimitErrorHandler);
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl,
    message: `Route ${req.originalUrl} not found`
  });
});

// Schedule automated file cleanup every minute for testing
cron.schedule('* * * * *', async () => {
  try {
    const uploadService = new UploadService();
    await uploadService.cleanupOldFiles(7); // Clean up files older than 7 days
    logger.info('Automated cleanup completed successfully');
  } catch (error) {
    logger.error('Failed to run automated file cleanup:', error);
  }
});

// Serve uploads directory outside web root
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

export default app;