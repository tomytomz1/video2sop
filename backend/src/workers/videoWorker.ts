import Bull from 'bull';
import { VideoService } from '../services/video.service';
import { YouTubeService } from '../services/youtube.service';
import { JobService, JobType } from '../services/job.service';
import logger from '../utils/logger';

interface VideoJob {
  jobId: string;
  videoUrl: string;
  type: JobType;
}

export class VideoWorker {
  private queue: Bull.Queue;
  private videoService: VideoService;
  private youtubeService: YouTubeService;
  private jobService: JobService;

  constructor() {
    this.queue = new Bull('video-processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    });

    this.videoService = new VideoService();
    this.youtubeService = new YouTubeService();
    this.jobService = new JobService();

    this.setupQueue();
  }

  private setupQueue(): void {
    this.queue.process(async (job: Bull.Job<VideoJob>) => {
      const { jobId, videoUrl, type } = job.data;
      
      try {
        // Update job status to processing
        await this.jobService.updateJobStatus(jobId, 'PROCESSING');

        let videoPath: string;

        // Handle YouTube downloads
        if (type === 'YOUTUBE') {
          // Validate YouTube URL
          const isValid = await this.youtubeService.validateUrl(videoUrl);
          if (!isValid) {
            throw new Error('Invalid YouTube URL');
          }

          // Get video info
          const videoInfo = await this.youtubeService.getVideoInfo(videoUrl);
          await this.jobService.updateJobMetadata(jobId, {
            title: videoInfo.title,
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail
          });

          // Download video with progress tracking
          videoPath = await this.youtubeService.downloadVideo(videoUrl, (progress) => {
            this.jobService.updateJobMetadata(jobId, { downloadProgress: progress });
          });
        } else {
          videoPath = videoUrl; // For file uploads, the path is already provided
        }

        // Validate video
        const isValid = await this.videoService.validateVideo(videoPath);
        if (!isValid) {
          throw new Error('Invalid video file');
        }

        // Get video information
        const videoInfo = await this.videoService.getVideoInfo(videoPath);
        await this.jobService.updateJobMetadata(jobId, {
          duration: videoInfo.duration,
          format: videoInfo.format,
          resolution: videoInfo.resolution,
          size: videoInfo.size
        });

        // Extract audio for transcription
        const audioPath = await this.videoService.extractAudio(videoPath);
        await this.jobService.updateJobMetadata(jobId, {
          audioPath
        });

        // Update job status to completed
        await this.jobService.updateJobStatus(jobId, 'COMPLETED');
        
        logger.info(`Job ${jobId} completed successfully`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error(`Job ${jobId} failed:`, error);
        await this.jobService.updateJobStatus(jobId, 'FAILED', errorMessage);
        throw error;
      }
    });

    this.queue.on('error', (error: Error) => {
      logger.error('Queue error:', error);
    });

    this.queue.on('failed', (job: Bull.Job<VideoJob>, error: Error) => {
      logger.error(`Job ${job.id} failed:`, error);
    });
  }

  async addJob(job: VideoJob): Promise<void> {
    await this.queue.add(job, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    logger.info(`Added job ${job.jobId} to queue`);
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
} 