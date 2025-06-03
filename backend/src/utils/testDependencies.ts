import { spawn } from 'child_process';
import logger from './logger';

export async function testYtDlp(): Promise<boolean> {
  return new Promise((resolve) => {
    const ytDlp = spawn('yt-dlp', ['--version']);
    
    ytDlp.stdout.on('data', (data) => {
      logger.info(`yt-dlp version: ${data}`);
    });

    ytDlp.stderr.on('data', (data) => {
      logger.error(`yt-dlp error: ${data}`);
    });

    ytDlp.on('close', (code) => {
      if (code === 0) {
        logger.info('yt-dlp is working correctly');
        resolve(true);
      } else {
        logger.error(`yt-dlp test failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

export async function testFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.stdout.on('data', (data) => {
      logger.info(`ffmpeg version: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      logger.error(`ffmpeg error: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        logger.info('ffmpeg is working correctly');
        resolve(true);
      } else {
        logger.error(`ffmpeg test failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

export async function testVideoDownload(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ytDlp = spawn('yt-dlp', [
      url,
      '-f', 'best[ext=mp4]',
      '-o', 'test-video.mp4',
      '--no-playlist'
    ]);
    
    ytDlp.stdout.on('data', (data) => {
      logger.info(`yt-dlp download progress: ${data}`);
    });

    ytDlp.stderr.on('data', (data) => {
      logger.error(`yt-dlp download error: ${data}`);
    });

    ytDlp.on('close', (code) => {
      if (code === 0) {
        logger.info('Video download test successful');
        resolve(true);
      } else {
        logger.error(`Video download test failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

export async function testAudioExtraction(videoPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      'test-audio.mp3'
    ]);
    
    ffmpeg.stdout.on('data', (data) => {
      logger.info(`ffmpeg extraction progress: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      logger.error(`ffmpeg extraction error: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        logger.info('Audio extraction test successful');
        resolve(true);
      } else {
        logger.error(`Audio extraction test failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

// Run all tests
export async function runAllTests() {
  logger.info('Starting dependency tests...');
  
  // Test yt-dlp
  const ytDlpWorking = await testYtDlp();
  if (!ytDlpWorking) {
    logger.error('yt-dlp test failed');
    return false;
  }

  // Test ffmpeg
  const ffmpegWorking = await testFfmpeg();
  if (!ffmpegWorking) {
    logger.error('ffmpeg test failed');
    return false;
  }

  // Test video download with a short YouTube video
  const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Short video
  const downloadWorking = await testVideoDownload(testVideoUrl);
  if (!downloadWorking) {
    logger.error('Video download test failed');
    return false;
  }

  // Test audio extraction
  const extractionWorking = await testAudioExtraction('test-video.mp4');
  if (!extractionWorking) {
    logger.error('Audio extraction test failed');
    return false;
  }

  logger.info('All dependency tests passed successfully!');
  return true;
} 