import { Worker, Job, Queue } from 'bullmq';
import { JobService } from '../services/job.service';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { VideoProcessor } from '../utils/videoProcessor';

const prisma = new PrismaClient();

interface VideoJobData {
  jobId: string;
  videoUrl: string;
  type: 'file' | 'youtube';
}

export class VideoWorker {
  private worker: Worker;
  private queue: Queue;
  private jobService: JobService;
  private videoProcessor: VideoProcessor;

  constructor() {
    logger.debug('Initializing VideoWorker...');
    this.jobService = new JobService();
    this.videoProcessor = new VideoProcessor();
    
    // Initialize the queue with Redis URL
    const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    const connection = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port, 10)
    };
    
    logger.debug(`Creating queue with Redis connection: ${JSON.stringify(connection)}`);
    this.queue = new Queue('video-processing', { connection });
    
    // Initialize the worker with concurrency limit
    const maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10);
    logger.debug(`Creating worker with concurrency: ${maxConcurrentJobs}`);
    
    this.worker = new Worker<VideoJobData>(
      'video-processing',
      async (job: Job<VideoJobData>) => {
        logger.debug(`Worker received job ${job.id} with data:`, job.data);
        try {
          await this.processVideo(job.data);
        } catch (error) {
          logger.error(`Error processing job ${job.data.jobId}:`, error);
          await this.handleError(job.data.jobId, error);
        }
      },
      { 
        connection,
        concurrency: maxConcurrentJobs
      }
    );

    // Handle worker events
    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.data.jobId} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.data.jobId} failed:`, error);
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });

    // Initialize video processor
    this.videoProcessor.initialize().catch(error => {
      logger.error('Failed to initialize video processor:', error);
    });

    logger.info('VideoWorker initialized successfully');
  }

  async addJob(jobData: VideoJobData) {
    try {
      logger.debug(`Adding job ${jobData.jobId} to queue with data:`, jobData);
      const job = await this.queue.add('process-video', jobData, {
        jobId: jobData.jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });
      logger.info(`Job ${jobData.jobId} added to queue successfully. Queue job ID: ${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job ${jobData.jobId} to queue:`, error);
      throw error;
    }
  }

  private async processVideo(data: VideoJobData) {
    const { jobId, videoUrl, type } = data;
    
    try {
      logger.debug(`Starting to process job ${jobId} with URL: ${videoUrl} and type: ${type}`);
      
      // Update job status to processing
      await this.jobService.updateJobStatus(jobId, 'PROCESSING');
      logger.info(`Job ${jobId}: Status updated to PROCESSING`);

      // 1. Download video
      logger.debug(`Job ${jobId}: Attempting to download video from ${videoUrl}`);
      const videoPath = await this.videoProcessor.downloadVideo(videoUrl, type);
      logger.info(`Job ${jobId}: Video downloaded successfully to ${videoPath}`);

      // 2. Extract audio
      logger.debug(`Job ${jobId}: Starting audio extraction from ${videoPath}`);
      const audioPath = await this.videoProcessor.extractAudio(videoPath);
      logger.info(`Job ${jobId}: Audio extracted successfully to ${audioPath}`);

      // 3. Extract screenshots
      logger.debug(`Job ${jobId}: Starting screenshot extraction from ${videoPath}`);
      const screenshots = await this.videoProcessor.extractScreenshots(videoPath);
      logger.info(`Job ${jobId}: Extracted ${screenshots.length} screenshots`);

      // For now, just simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update job status to completed
      await this.jobService.updateJobStatus(jobId, 'COMPLETED', 'https://example.com/sop.pdf');
      logger.info(`Job ${jobId}: Status updated to COMPLETED`);

      // Cleanup temporary files
      await this.videoProcessor.cleanup(jobId);
    } catch (error) {
      logger.error(`Error in processVideo for job ${jobId}:`, error);
      throw error;
    }
  }

  private async handleError(jobId: string, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Job ${jobId} failed: ${errorMessage}`);
    await this.jobService.updateJobStatus(jobId, 'FAILED', undefined, errorMessage);
    
    // Cleanup temporary files even if job failed
    await this.videoProcessor.cleanup(jobId);
  }

  async close() {
    logger.info('Closing VideoWorker...');
    await this.worker.close();
    await this.queue.close();
    logger.info('VideoWorker closed successfully');
  }
} 