import { PrismaClient } from '@prisma/client';
import logger from './logger';

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log Prisma events
prisma.$on('query', (e) => {
  logger.debug('Query:', {
    query: e.query,
    params: e.params,
    duration: `${e.duration}ms`,
  });
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error:', {
    message: e.message,
    target: e.target,
  });
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info:', {
    message: e.message,
    target: e.target,
  });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', {
    message: e.message,
    target: e.target,
  });
});

// Verify database connection with retries
export const verifyConnection = async (retries = MAX_RETRIES): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to database');
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Failed to connect to database. Retrying in ${RETRY_DELAY}ms... (${retries} attempts remaining)`);
      await sleep(RETRY_DELAY);
      return verifyConnection(retries - 1);
    }
    
    logger.error('Failed to connect to database after multiple attempts:', error);
    process.exit(1);
  }
};

// Graceful shutdown
export const disconnect = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Successfully disconnected from database');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Disconnecting from database...');
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Disconnecting from database...');
  await disconnect();
  process.exit(0);
});

export default prisma; 