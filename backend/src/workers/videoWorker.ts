import { Worker, Job } from 'bullmq';
import { JobService, JobStatus } from '../services/job.service';
import { AppError } from '../middleware/error';

interface VideoJobData {
  jobId: string;
  videoUrl: string;
}

export class VideoWorker {
  private worker: Worker;
  private jobService: JobService;

  constructor(connection: { host: string; port: number }) {
    this.jobService = new JobService();
    this.worker = new Worker<VideoJobData>(
      'video-processing',
      async (job: Job<VideoJobData>) => {
        try {
          await this.processVideo(job.data);
        } catch (error) {
          await this.handleError(job.data.jobId, error);
        }
      },
      { connection }
    );
  }

  private async processVideo(data: VideoJobData) {
    const { jobId, videoUrl } = data;
    
    // Update job status to processing
    await this.jobService.updateJobStatus(jobId, JobStatus.PROCESSING);

    // TODO: Implement video processing logic
    // 1. Download video
    // 2. Extract audio
    // 3. Generate transcription
    // 4. Extract screenshots
    // 5. Generate SOP

    // For now, just simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update job status to completed
    await this.jobService.updateJobStatus(jobId, JobStatus.COMPLETED, 'https://example.com/sop.pdf');
  }

  private async handleError(jobId: string, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await this.jobService.updateJobStatus(jobId, JobStatus.FAILED, undefined, errorMessage);
  }

  async close() {
    await this.worker.close();
  }
} 