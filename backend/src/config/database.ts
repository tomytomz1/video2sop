import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Prisma client with connection pooling and logging
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
  });
}

// Log errors
prisma.$on('error', (e) => {
  logger.error('Prisma Error: ' + e.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
}); 