import Bull from 'bull';
import { VideoService } from '../services/video.service';
import { YouTubeService } from '../services/youtube.service';
import { JobService, JobType } from '../services/job.service';
import logger from '../utils/logger';
import { TranscriptionService } from '../services/transcription.service';
import { SOPService } from '../services/sop.service';
import { ScreenshotService } from '../services/screenshot.service';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { validateEnv } from '../utils/env';

const env = validateEnv();

interface VideoJob {
  jobId: string;
  videoUrl: string;
  type: 'FILE' | 'YOUTUBE';
  sopTemplate?: number;
}

export class VideoWorker {
  private queue: Bull.Queue;
  private jobService: JobService;
  private videoService: VideoService;
  private youtubeService: YouTubeService;
  private transcriptionService: TranscriptionService;
  private sopService: SOPService;
  private screenshotService: ScreenshotService;
  private readonly tempDir: string;

  constructor() {
    this.queue = new Bull('video-processing', {
      redis: env.REDIS_URL,
    });
    this.jobService = new JobService();
    this.videoService = new VideoService();
    this.youtubeService = new YouTubeService();
    this.transcriptionService = new TranscriptionService();
    this.sopService = new SOPService();
    this.screenshotService = new ScreenshotService();
    this.tempDir = env.UPLOAD_DIR;
    this.setupQueue();
  }

  private setupQueue(): void {
    this.queue.process(async (job: Bull.Job<VideoJob>) => {
      const { jobId, videoUrl, type, sopTemplate = 0 } = job.data;
      
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

          // Create output path for YouTube download
          const outputPath = path.join(this.tempDir, `${uuidv4()}.mp4`);
          
          // Download video
          videoPath = await this.youtubeService.downloadVideo(videoUrl, outputPath);
          // Update progress in metadata
          await this.jobService.updateJobMetadata(jobId, { downloadProgress: 100 });
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

        // Extract screenshots
        const screenshots = await this.screenshotService.extractScreenshots(videoPath);
        await this.jobService.updateJobMetadata(jobId, {
          screenshots
        });

        // Extract audio for transcription
        const audioPath = await this.videoService.extractAudio(videoPath);
        await this.jobService.updateJobMetadata(jobId, {
          audioPath
        });

        // Transcribe audio
        const { transcription } = await this.transcriptionService.transcribeAudio(audioPath);
        
        // Validate transcription
        const isValidTranscription = await this.transcriptionService.validateTranscription(transcription);
        if (!isValidTranscription) {
          throw new Error('Invalid transcription result');
        }

        // Update job with transcription
        await this.jobService.updateJobMetadata(jobId, {
          transcription
        });

        // Generate SOP
        const sop = await this.sopService.generateSOP(transcription, sopTemplate);
        
        // Validate SOP
        const isValidSOP = await this.sopService.validateSOP(sop);
        if (!isValidSOP) {
          throw new Error('Invalid SOP result');
        }

        // Update job with SOP
        await this.jobService.updateJobMetadata(jobId, {
          sop
        });

        // Generate PDF from SOP
        const sopHtml = `<html><body>${sop}</body></html>`; // You may want to improve HTML formatting
        const pdfPath = await this.sopService.exportSOPToPDF(jobId, sopHtml);
        await this.jobService.updateJobMetadata(jobId, {
          pdfPath
        });

        // Clean up temporary files
        await fs.unlink(videoPath).catch(err => logger.error('Failed to delete video file:', err));
        await fs.unlink(audioPath).catch(err => logger.error('Failed to delete audio file:', err));
        await this.transcriptionService.cleanupTranscription(audioPath.replace('.mp3', '.txt'));
        await this.screenshotService.cleanupScreenshots(screenshots);

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