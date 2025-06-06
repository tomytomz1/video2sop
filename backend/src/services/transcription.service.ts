import { spawn } from 'child_process';
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import OpenAI from 'openai';
import FormData from 'form-data';
import fetch from 'node-fetch';

export class TranscriptionService {
  private readonly openai: OpenAI;
  private readonly tempDir: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.tempDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.ensureDirs().catch(error => {
      logger.error('Failed to create directories:', error);
    });
  }

  private async ensureDirs(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info(`Created directory: ${this.tempDir}`);
    } catch (error) {
      logger.error('Failed to create transcription directories:', error);
      throw new AppError('Failed to initialize transcription directories', 500);
    }
  }

  async transcribeAudio(audioPath: string): Promise<{ transcription: string, transcriptionPath: string }> {
    try {
      // Check if file exists
      await fs.access(audioPath);
      
      // Create a temporary file for the transcription
      const transcriptionPath = path.join(this.tempDir, `${path.basename(audioPath, path.extname(audioPath))}.txt`);
      
      // Create a form data object
      const formData = new FormData();
      formData.append('file', createReadStream(audioPath));
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      
      // Make the API request
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const transcription = await response.text();

      // Save the transcription
      await fs.writeFile(transcriptionPath, transcription);
      
      logger.info(`Transcription completed successfully: ${transcriptionPath}`);
      return { transcription, transcriptionPath };
    } catch (error) {
      logger.error('Transcription failed:', error);
      throw new AppError('Failed to transcribe audio', 500);
    }
  }

  async validateTranscription(transcription: string): Promise<boolean> {
    // Basic validation to ensure transcription is not empty and has reasonable length
    if (!transcription || transcription.trim().length === 0) {
      return false;
    }
    
    // Check if transcription has reasonable length (e.g., at least 10 characters)
    if (transcription.length < 10) {
      return false;
    }
    
    return true;
  }

  async cleanupTranscription(transcriptionPath: string): Promise<void> {
    try {
      await fs.unlink(transcriptionPath);
      logger.info(`Cleaned up transcription file: ${transcriptionPath}`);
    } catch (error) {
      logger.error('Failed to cleanup transcription file:', error);
    }
  }
} 