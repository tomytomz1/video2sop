import { validateEnv } from '../utils/env';
import { validateEnvironmentVariables } from '../utils/validateEnv';
import { z } from 'zod';
import logger from '../utils/logger';

// Mock the logger
jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

describe('Environment Variable Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    // Clear mock calls
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
  });

  it('should throw error when JWT_SECRET is missing', () => {
    // Remove JWT_SECRET from environment
    delete process.env.JWT_SECRET;

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  it('should throw error when JWT_SECRET is too short', () => {
    // Set JWT_SECRET to be too short
    process.env.JWT_SECRET = 'short';

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/JWT_SECRET must be at least 32 characters long/);
  });

  it('should throw error when DATABASE_URL is missing', () => {
    // Remove DATABASE_URL from environment
    delete process.env.DATABASE_URL;

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });

  it('should throw error when REDIS_URL is missing', () => {
    // Remove REDIS_URL from environment
    delete process.env.REDIS_URL;

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/REDIS_URL/);
  });

  it('should throw error when FILE_ENCRYPTION_KEY is wrong length', () => {
    // Set FILE_ENCRYPTION_KEY to wrong length
    process.env.FILE_ENCRYPTION_KEY = 'wrong-length-key';

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/FILE_ENCRYPTION_KEY must be exactly 32 characters/);
  });

  it('should throw error when NODE_ENV is invalid', () => {
    // Set NODE_ENV to invalid value
    process.env.NODE_ENV = 'invalid-env';

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/NODE_ENV/);
  });

  it('should throw error when CORS_ORIGIN is invalid URL', () => {
    // Set CORS_ORIGIN to invalid URL
    process.env.CORS_ORIGIN = 'not-a-url';

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/CORS_ORIGIN/);
  });

  it('should throw error when numeric values are invalid', () => {
    // Set MAX_FILE_SIZE to invalid value
    process.env.MAX_FILE_SIZE = 'not-a-number';

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/MAX_FILE_SIZE/);
  });

  it('should throw error when ADMIN_TOKEN is missing', () => {
    // Remove ADMIN_TOKEN from environment
    delete process.env.ADMIN_TOKEN;

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/ADMIN_TOKEN/);
  });

  it('should throw error when ADMIN_TOKEN is too short', () => {
    // Set ADMIN_TOKEN to be too short
    process.env.ADMIN_TOKEN = 'short';

    // Expect validation to throw with descriptive error
    expect(() => validateEnv()).toThrow(/ADMIN_TOKEN must be at least 32 characters long/);
  });

  it('should throw error when multiple required variables are missing', () => {
    // Remove multiple required variables
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;

    // Expect validation to throw with descriptive error containing all missing variables
    expect(() => validateEnv()).toThrow(/JWT_SECRET.*DATABASE_URL.*REDIS_URL/);
  });

  it('should accept valid environment variables', () => {
    // Set all required environment variables with valid values
    process.env = {
      ...process.env,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'a'.repeat(32),
      JWT_EXPIRES_IN: '7d',
      PORT: '3000',
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:3000',
      MAX_FILE_SIZE: '10485760',
      UPLOAD_DIR: './uploads',
      FILE_ENCRYPTION_KEY: 'a'.repeat(32),
      JOB_RETENTION_DAYS: '7',
      MAX_CONCURRENT_JOBS: '5',
      LOG_LEVEL: 'info',
      YTDLP_COOKIES_PATH: './cookies.txt',
      OPENAI_API_KEY: 'sk-test-key',
      RATE_LIMIT_WINDOW: '15',
      RATE_LIMIT_MAX: '100',
      ADMIN_TOKEN: 'a'.repeat(32)
    };

    // Expect validation to succeed
    expect(() => validateEnv()).not.toThrow();
  });

  describe('Default Secret Warnings', () => {
    it('should warn when using default JWT_SECRET', () => {
      process.env.JWT_SECRET = 'your-256-bit-secret';
      validateEnvironmentVariables();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: You are using a default JWT_SECRET')
      );
    });

    it('should warn when using default FILE_ENCRYPTION_KEY', () => {
      process.env.FILE_ENCRYPTION_KEY = 'your-32-character-encryption-key';
      validateEnvironmentVariables();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: You are using a default FILE_ENCRYPTION_KEY')
      );
    });

    it('should warn for multiple default secrets', () => {
      process.env.JWT_SECRET = 'your-256-bit-secret';
      process.env.FILE_ENCRYPTION_KEY = 'your-32-character-encryption-key';
      validateEnvironmentVariables();
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: You are using a default JWT_SECRET')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: You are using a default FILE_ENCRYPTION_KEY')
      );
    });

    it('should not warn when using custom secrets', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.FILE_ENCRYPTION_KEY = 'a'.repeat(32);
      validateEnvironmentVariables();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
}); 