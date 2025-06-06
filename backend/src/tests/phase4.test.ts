import { VideoService } from '../services/video.service';
import { TranscriptionService } from '../services/transcription.service';
import { SOPService } from '../services/sop.service';
import { ScreenshotService } from '../services/screenshot.service';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Verify OpenAI API key is present
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// Test video path (use the valid test video)
const TEST_VIDEO_PATH = path.join(__dirname, 'test-video.mp4');

async function testTranscription(): Promise<void> {
  console.log('\nTesting Transcription Service...');
  const transcriptionService = new TranscriptionService();
  const videoService = new VideoService();

  try {
    // Extract audio
    console.log('Extracting audio...');
    const audioPath = await videoService.extractAudio(TEST_VIDEO_PATH);
    console.log('Audio extracted successfully');

    // Transcribe audio
    console.log('Transcribing audio...');
    const { transcription, transcriptionPath } = await transcriptionService.transcribeAudio(audioPath);
    console.log('Transcription completed successfully');
    console.log('Transcription sample:', transcription.substring(0, 100) + '...');

    // Validate transcription
    console.log('Validating transcription...');
    const isValid = await transcriptionService.validateTranscription(transcription);
    console.log('Transcription validation:', isValid ? 'PASSED' : 'FAILED');

    // Cleanup
    await fs.unlink(audioPath);
    await transcriptionService.cleanupTranscription(transcriptionPath);
  } catch (error) {
    console.error('Transcription test failed:', error);
    throw error;
  }
}

async function testSOPGeneration(): Promise<void> {
  console.log('\nTesting SOP Generation Service...');
  const sopService = new SOPService();
  const transcriptionService = new TranscriptionService();
  const videoService = new VideoService();

  try {
    // Get transcription first
    const audioPath = await videoService.extractAudio(TEST_VIDEO_PATH);
    const { transcription, transcriptionPath } = await transcriptionService.transcribeAudio(audioPath);

    // Generate SOP
    console.log('Generating SOP...');
    const sop = await sopService.generateSOP(transcription);
    console.log('SOP generated successfully');
    console.log('SOP sample:', sop.substring(0, 100) + '...');

    // Validate SOP
    console.log('Validating SOP...');
    const isValid = await sopService.validateSOP(sop);
    console.log('SOP validation:', isValid ? 'PASSED' : 'FAILED');

    // Test different templates
    console.log('Testing different templates...');
    const templates = sopService.getAvailableTemplates();
    for (let i = 0; i < templates.length; i++) {
      console.log(`Testing template ${i + 1}: ${templates[i].title}`);
      const templateSop = await sopService.generateSOP(transcription, i);
      const templateValid = await sopService.validateSOP(templateSop, i);
      console.log(`Template ${i + 1} validation:`, templateValid ? 'PASSED' : 'FAILED');
    }

    // Cleanup
    await fs.unlink(audioPath);
    await transcriptionService.cleanupTranscription(transcriptionPath);
  } catch (error) {
    console.error('SOP generation test failed:', error);
    throw error;
  }
}

async function testScreenshotExtraction(): Promise<void> {
  console.log('\nTesting Screenshot Service...');
  const screenshotService = new ScreenshotService();

  try {
    // Extract screenshots
    console.log('Extracting screenshots...');
    const screenshots = await screenshotService.extractScreenshots(TEST_VIDEO_PATH);
    console.log(`Extracted ${screenshots.length} screenshots successfully`);

    // Verify screenshot files
    console.log('Verifying screenshot files...');
    for (const screenshot of screenshots) {
      const stats = await fs.stat(screenshot);
      console.log(`Screenshot ${path.basename(screenshot)}:`, {
        size: stats.size,
        exists: true
      });
    }

    // Cleanup
    console.log('Cleaning up screenshots...');
    await screenshotService.cleanupScreenshots(screenshots);
    console.log('Screenshots cleaned up successfully');
  } catch (error) {
    console.error('Screenshot test failed:', error);
    throw error;
  }
}

async function runTests(): Promise<void> {
  try {
    console.log('Starting Phase 4 Integration Tests...');

    // Run tests
    await testTranscription();
    await testSOPGeneration();
    await testScreenshotExtraction();

    console.log('\nAll Phase 4 tests completed successfully!');
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests(); 