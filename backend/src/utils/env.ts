import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Only load .env from disk when running locally (not in Docker/production)
const isLocal = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'docker';

if (isLocal) {
  const ROOT_ENV_PATH = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(ROOT_ENV_PATH)) {
    dotenv.config({ path: ROOT_ENV_PATH });
  } else {
    console.warn('[env] WARNING: .env file not found at project root. Falling back to process.env only.');
  }
}

const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'FILE_ENCRYPTION_KEY',
  'ADMIN_TOKEN',
];

function validateSecrets() {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of REQUIRED_SECRETS) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    } else if (key === 'FILE_ENCRYPTION_KEY') {
      if (value.length !== 32) {
        invalid.push(`${key} (must be exactly 32 chars)`);
      }
      if (/^\s|\s$/.test(value)) {
        invalid.push(`${key} (must not start/end with whitespace)`);
      }
    } else if (/^\s|\s$/.test(value)) {
      invalid.push(`${key} (must not start/end with whitespace)`);
    }
  }

  if (missing.length || invalid.length) {
    console.error('\n❌ FATAL: Missing or invalid environment variables:');
    if (missing.length) console.error('  Missing:', missing.join(', '));
    if (invalid.length) console.error('  Invalid:', invalid.join(', '));
    console.error('\nCheck your .env file at project root. The app will now exit.\n');
    process.exit(1);
  }
}

validateSecrets();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('video2sop'),
  
  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PORT: z.string().transform(Number).optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Server
  PORT: z.string().transform(Number).default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_PATH: z.string().default('./uploads'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
  
  // Email (optional - only required if email features are used)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // Security
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).optional(),
  AUTH_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).optional(),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).optional(),
  UPLOAD_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).optional(),
  UPLOAD_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).optional(),
  API_KEY_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).optional(),
  API_KEY_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).optional(),
  WEBHOOK_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).optional(),
  WEBHOOK_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).optional(),
  MONITORING_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).optional(),
  MONITORING_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).optional(),
  
  // Monitoring
  METRICS_RETENTION_DAYS: z.string().transform(Number).optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('104857600'), // 100MB
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  FILE_ENCRYPTION_KEY: z.string().length(32, 'FILE_ENCRYPTION_KEY must be exactly 32 characters'),
  
  // Job Processing
  JOB_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().positive()).default('7'),
  MAX_CONCURRENT_JOBS: z.string().transform(Number).pipe(z.number().positive()).default('5'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // YouTube
  YTDLP_COOKIES_PATH: z.string().min(1).default('./cookies.txt'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('15'),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  SENSITIVE_RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('15'),
  SENSITIVE_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  
  // Admin
  ADMIN_TOKEN: z.string().min(32, 'ADMIN_TOKEN must be at least 32 characters long'),
  
  // Backup (optional)
  BACKUP_ENCRYPTION_KEY: z.string().min(32).optional(),
  
  // Screenshot/Job Processing
  MAX_SCREENSHOTS: z.string().transform(Number).default('10'),
  SCREENSHOT_INTERVAL: z.string().transform(Number).default('60'),
});

export const validateEnv = () => {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Log warning if SMTP is not configured but might be needed
    if (!parsed.SMTP_HOST && parsed.NODE_ENV === 'production') {
      console.warn('⚠️  WARNING: SMTP is not configured. Email features will not work.');
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

export type Env = z.infer<typeof envSchema>;