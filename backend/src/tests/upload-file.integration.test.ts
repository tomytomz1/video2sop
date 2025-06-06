import request from 'supertest';
import app from '../app';
import path from 'path';
import fs from 'fs';

describe('POST /api/upload/file (Signature Validation)', () => {
  const endpoint = '/api/upload/file';
  const validVideoPath = path.join(__dirname, 'sample-30s.mp4'); // Use the new small sample video
  const randomDataPath = path.join(__dirname, 'random.bin');
  const fakeMp4Path = path.join(__dirname, 'fake-mp4.mp4');

  beforeAll(() => {
    // Create a random data file
    fs.writeFileSync(randomDataPath, Buffer.from('this is not a video'));
    // Create a fake mp4 (actually a jpg renamed)
    const jpgHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    fs.writeFileSync(fakeMp4Path, jpgHeader);
  });

  afterAll(() => {
    fs.unlinkSync(randomDataPath);
    fs.unlinkSync(fakeMp4Path);
  });

  it('should accept a valid MP4 video file', async () => {
    const res = await request(app)
      .post(endpoint)
      .attach('video', validVideoPath);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
  });

  it('should reject a .mp4 file with random data (wrong signature)', async () => {
    const res = await request(app)
      .post(endpoint)
      .attach('video', randomDataPath, { filename: 'random.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('should reject a .mp4 file with a JPG signature', async () => {
    const res = await request(app)
      .post(endpoint)
      .attach('video', fakeMp4Path, { filename: 'fake-mp4.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);
  });
}); 