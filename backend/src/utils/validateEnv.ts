import { z } from 'zod';
import { validateEnv } from './env';
import logger from './logger';

// These are the DEFAULT/PLACEHOLDER values we want to warn about
const DEFAULT_SECRETS = {
  JWT_SECRET: 'your-256-bit-secret',
  FILE_ENCRYPTION_KEY: 'your-32-character-encryption-key',
  ADMIN_TOKEN: 'your_admin_token',
  BACKUP_ENCRYPTION_KEY: 'your_backup_key'
};

export function validateEnvironmentVariables() {
  try {
    // Use the existing validateEnv function which already handles all validation
    const env = validateEnv();
    
    console.log('Environment validation passed');
    
    // Check for default secrets using process.env (before transformation)
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