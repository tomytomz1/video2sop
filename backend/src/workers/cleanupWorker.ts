import { JobService } from '../services/job.service';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import cron from 'node-cron';
import logger from '../utils/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed');
const SCREENSHOTS_DIR = path.join(UPLOAD_DIR, 'screenshots');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const CLEANUP_DAYS = parseInt(process.env.CLEANUP_DAYS || '7', 10);

const jobService = new JobService();

async function deleteFileIfExists(filePath: string) {
  try {
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
      logger.info(`Deleted old file: ${filePath}`);
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      logger.warn(`File in use, could not delete: ${filePath}`);
    } else {
      logger.error(`Failed to delete file: ${filePath}`, error);
    }
  }
}

async function deleteDirIfExists(dirPath: string) {
  try {
    if (existsSync(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
      logger.info(`Deleted directory: ${dirPath}`);
    }
  } catch (err) {
    logger.error(`Failed to delete directory: ${dirPath}`, err);
  }
}

function getAudioPathFromMetadata(metadata: any): string | undefined {
  if (metadata && typeof metadata === 'object' && 'audioPath' in metadata) {
    return metadata.audioPath;
  }
  return undefined;
}

async function cleanupOldJobs() {
  logger.info('Starting cleanup of old jobs...');
  const now = new Date();
  const threshold = new Date(now.getTime() - CLEANUP_DAYS * 24 * 60 * 60 * 1000);
  const jobs = await jobService.listJobs();
  const oldJobs = jobs.filter(job => new Date(job.createdAt) < threshold);

  for (const job of oldJobs) {
    logger.info(`Cleaning up job: ${job.id}`);
    // Delete processed audio/video
    const audioPath = getAudioPathFromMetadata(job.metadata);
    if (audioPath) {
      await deleteFileIfExists(audioPath);
    }
    if (job.videoUrl && job.type === 'FILE') {
      await deleteFileIfExists(job.videoUrl);
    }
    // Delete screenshots directory
    if (job.screenshots && job.screenshots.length > 0) {
      // Screenshots are stored in a directory named after the job id
      const screenshotDir = path.join(SCREENSHOTS_DIR, job.id);
      await deleteDirIfExists(screenshotDir);
    }
    // Delete transcript file
    if (audioPath) {
      const transcriptPath = path.join(UPLOAD_DIR, `${path.basename(audioPath, path.extname(audioPath))}.txt`);
      await deleteFileIfExists(transcriptPath);
    }
    // Delete SOP file if stored as a file (if implemented in the future)
    // Delete temp files (optional, if temp files are job-specific)
    // Remove job from DB
    await jobService.deleteJob(job.id);
    logger.info(`Job ${job.id} and associated files cleaned up.`);
  }
  logger.info('Cleanup of old jobs complete.');
}

// Schedule cleanup to run daily at 2:00 AM
cron.schedule('0 2 * * *', cleanupOldJobs);

// Export for manual triggering/testing
export { cleanupOldJobs }; 