import Redis from 'ioredis';
import { logger } from './logger';
import { validateEnv } from './env';

const env = validateEnv();

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const redisClient = new Redis(env.REDIS_URL, {
  retryStrategy: (times: number) => {
    if (times > MAX_RETRIES) {
      logger.error('Redis max retries reached. Giving up...');
      return null; // Stop retrying
    }
    const delay = Math.min(times * RETRY_DELAY, 30000); // Max 30s delay
    logger.warn(`Redis connection failed. Retrying in ${delay}ms... (Attempt ${times}/${MAX_RETRIES})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect on READONLY error
    }
    return false;
  }
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('close', () => {
  logger.info('Redis connection closed');
});

export const getRedisClient = () => redisClient;

export const setKey = async (key: string, value: string, ttl?: number) => {
  try {
    if (ttl) {
      await redisClient.set(key, value, 'EX', ttl);
    } else {
      await redisClient.set(key, value);
    }
  } catch (err) {
    logger.error('Redis set error:', err);
    throw err;
  }
};

export const getKey = async (key: string) => {
  try {
    return await redisClient.get(key);
  } catch (err) {
    logger.error('Redis get error:', err);
    throw err;
  }
};

export const deleteKey = async (key: string) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.error('Redis delete error:', err);
    throw err;
  }
};

export const incrementKey = async (key: string) => {
  try {
    return await redisClient.incr(key);
  } catch (err) {
    logger.error('Redis increment error:', err);
    throw err;
  }
};

export const setHash = async (key: string, field: string, value: string) => {
  try {
    await redisClient.hset(key, field, value);
  } catch (err) {
    logger.error('Redis hset error:', err);
    throw err;
  }
};

export const getHash = async (key: string, field: string) => {
  try {
    return await redisClient.hget(key, field);
  } catch (err) {
    logger.error('Redis hget error:', err);
    throw err;
  }
};

export const getAllHash = async (key: string) => {
  try {
    return await redisClient.hgetall(key);
  } catch (err) {
    logger.error('Redis hgetall error:', err);
    throw err;
  }
};

export const deleteHash = async (key: string, field: string) => {
  try {
    await redisClient.hdel(key, field);
  } catch (err) {
    logger.error('Redis hdel error:', err);
    throw err;
  }
};

export const setExpiry = async (key: string, ttl: number) => {
  try {
    await redisClient.expire(key, ttl);
  } catch (err) {
    logger.error('Redis expire error:', err);
    throw err;
  }
};

export const getTTL = async (key: string) => {
  try {
    return await redisClient.ttl(key);
  } catch (err) {
    logger.error('Redis ttl error:', err);
    throw err;
  }
};

export const closeRedisConnection = async () => {
  try {
    await redisClient.quit();
  } catch (err) {
    logger.error('Redis quit error:', err);
    throw err;
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Closing Redis connection...');
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Closing Redis connection...');
  await closeRedisConnection();
  process.exit(0);
}); 