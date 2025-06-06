import { z } from 'zod';
import { validateEnv } from './env';
import logger from './logger';

const requiredEnvVars = {
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().positive()).optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Server
  PORT: z.string().transform(Number).pipe(z.number().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()),
  UPLOAD_DIR: z.string().min(1, 'UPLOAD_DIR is required'),
  FILE_ENCRYPTION_KEY: z.string().length(32, 'FILE_ENCRYPTION_KEY must be exactly 32 characters'),
  
  // Job Processing
  JOB_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().positive()),
  MAX_CONCURRENT_JOBS: z.string().transform(Number).pipe(z.number().positive()),
  FILE_EXPIRATION_DAYS: z.string().transform(Number).pipe(z.number().positive()).default('7'),
  CLEANUP_DAYS: z.string().transform(Number).pipe(z.number().positive()).default('7'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // YouTube
  YTDLP_COOKIES_PATH: z.string().min(1, 'YTDLP_COOKIES_PATH is required'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().positive()),
  
  // Screenshots
  MAX_SCREENSHOTS: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  SCREENSHOT_INTERVAL: z.string().transform(Number).pipe(z.number().positive()).default('60'),
};

const DEFAULT_SECRETS = {
  JWT_SECRET: 'your-256-bit-secret',
  FILE_ENCRYPTION_KEY: 'your-32-character-encryption-key'
};

export function validateEnvironmentVariables() {
  try {
    const env = validateEnv();
    const schema = z.object(requiredEnvVars);
    const result = schema.safeParse(env);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      console.error('Environment validation failed:');
      errors.forEach(err => {
        console.error(`- ${err.path}: ${err.message}`);
      });
      
      throw new Error('Environment validation failed');
    }
    
    console.log('Environment validation passed');
    
    // Check for default secrets
    Object.entries(DEFAULT_SECRETS).forEach(([key, defaultValue]) => {
      if (process.env[key] === defaultValue) {
        logger.warn(
          `⚠️  WARNING: You are using a default ${key}! ` +
          `Set a strong value in your .env file before going to production.`
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Environment validation error:', error);
    process.exit(1);
  }
} 