import { validateEnv } from './env';
import logger from './logger';

const DEFAULT_SECRETS = {
  JWT_SECRET: 'your-256-bit-secret',
  FILE_ENCRYPTION_KEY: 'your-32-character-encryption-key'
};

export function validateEnvironmentVariables() {
  try {
    const env = validateEnv(); // Already validated and transformed

    // Check for default secrets, warn if needed
    Object.entries(DEFAULT_SECRETS).forEach(([key, defaultValue]) => {
      if (env[key as keyof typeof env] === defaultValue) {
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