import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Always load .env from the project root
const ROOT_ENV_PATH = path.resolve(__dirname, '../../.env');
if (fs.existsSync(ROOT_ENV_PATH)) {
  dotenv.config({ path: ROOT_ENV_PATH });
} else {
  console.warn('[env] WARNING: .env file not found at project root. Falling back to process.env only.');
}

const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'FILE_ENCRYPTION_KEY',
  'ADMIN_TOKEN',
  'BACKUP_ENCRYPTION_KEY',
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
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string(),
  
  // Server
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  
  // Storage
  STORAGE_TYPE: z.enum(['local', 's3']),
  STORAGE_PATH: z.string(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
  
  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string().email(),
  
  // Security
  CORS_ORIGIN: z.string().url(),
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
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()),
  UPLOAD_DIR: z.string().min(1),
  FILE_ENCRYPTION_KEY: z.string().length(32, 'FILE_ENCRYPTION_KEY must be exactly 32 characters'),
  
  // Job Processing
  JOB_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().positive()),
  MAX_CONCURRENT_JOBS: z.string().transform(Number).pipe(z.number().positive()),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // YouTube
  YTDLP_COOKIES_PATH: z.string().min(1),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('15'),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  SENSITIVE_RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('15'),
  SENSITIVE_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  
  // Admin
  ADMIN_TOKEN: z.string().min(32, 'ADMIN_TOKEN must be at least 32 characters long'),
  
  // Backup
  BACKUP_ENCRYPTION_KEY: z.string().min(32),
});

export const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => err.path.join('.'))
        .join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

export type Env = z.infer<typeof envSchema>; 