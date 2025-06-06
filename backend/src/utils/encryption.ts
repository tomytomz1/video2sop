import crypto from 'crypto';
import fs from 'fs';
import { validateEnv } from './env';

const ALGORITHM = 'aes-256-cbc';
const env = validateEnv();
const KEY = Buffer.from(env.FILE_ENCRYPTION_KEY, 'utf8'); // 32 bytes
const IV_LENGTH = 16;

export function encryptFile(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath, { mode: 0o600 });
    output.write(iv); // prepend IV
    input.pipe(cipher).pipe(output);
    output.on('finish', resolve);
    output.on('error', reject);
    input.on('error', reject);
  });
}

export function decryptFile(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    let iv: Buffer | null = null;
    let decipher: crypto.Decipher | null = null;
    let started = false;
    const output = fs.createWriteStream(outputPath, { mode: 0o600 });
    input.on('readable', () => {
      if (!started) {
        iv = input.read(IV_LENGTH);
        if (!iv) return;
        decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        started = true;
        input.pipe(decipher).pipe(output);
      }
    });
    output.on('finish', resolve);
    output.on('error', reject);
    input.on('error', reject);
  });
} 