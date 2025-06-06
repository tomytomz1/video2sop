import Queue from 'bull';
import { Redis } from 'ioredis';
import { logger } from './logger';

// Create Redis client
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create queues
export const videoQueue = new Queue('video-processing', {
  redis: {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
  },
});

export const cleanupQueue = new Queue('cleanup', {
  redis: {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
  },
});

// Queue event handlers
videoQueue.on('completed', (job: Queue.Job) => {
  logger.info(`Job ${job.id} completed`);
});

videoQueue.on('failed', (job: Queue.Job, err: Error) => {
  logger.error(`Job ${job.id} failed: ${err.message}`);
});

videoQueue.on('stalled', (job: Queue.Job) => {
  logger.warn(`Job ${job.id} stalled`);
});

videoQueue.on('active', (job: Queue.Job) => {
  logger.info(`Job ${job.id} started processing`);
});

// Cleanup queue event handlers
cleanupQueue.on('completed', (job: Queue.Job) => {
  logger.info(`Cleanup job ${job.id} completed`);
});

cleanupQueue.on('failed', (job: Queue.Job, err: Error) => {
  logger.error(`Cleanup job ${job.id} failed: ${err.message}`);
});

// Export queue processors
export const processVideo = async (job: Queue.Job) => {
  // Video processing logic here
  return { success: true };
};

export const processCleanup = async (job: Queue.Job) => {
  // Cleanup logic here
  return { success: true };
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await videoQueue.close();
  await cleanupQueue.close();
  await redisClient.quit();
}); 