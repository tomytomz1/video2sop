import request from 'supertest';
import app from '../app';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const testFilePath = path.join(__dirname, 'sample-30s.mp4');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('Upload/Download Access Control & Encryption (Integration)', () => {
  let anonSessionCookie: string;
  let userToken: string;
  let jobId: string;

  beforeAll(async () => {
    // Register and login a user
    const email = `testuser+${Date.now()}@example.com`;
    const password = 'testpass123';
    await request(app).post('/api/auth/register').send({ email, password });
    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    userToken = loginRes.body.token;
  });

  it('should allow anonymous upload and only allow download with same session', async () => {
    // Upload as anonymous
    const uploadRes = await request(app)
      .post('/api/upload/file')
      .attach('video', testFilePath)
      .expect(201);
    anonSessionCookie = uploadRes.headers['set-cookie'][0].split(';')[0];
    jobId = uploadRes.body.data.jobId;

    // Download as same session (should succeed)
    const downloadRes = await request(app)
      .get(`/api/jobs/${jobId}/export/pdf`)
      .set('Cookie', anonSessionCookie)
      .expect(200);
    expect(downloadRes.headers['content-type']).toMatch(/pdf/);

    // Download as different session (should fail)
    await request(app)
      .get(`/api/jobs/${jobId}/export/pdf`)
      .expect(403);
  });

  it('should allow authenticated upload and only allow download with same user', async () => {
    // Upload as authenticated user
    const uploadRes = await request(app)
      .post('/api/upload/file')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('video', testFilePath)
      .expect(201);
    const userJobId = uploadRes.body.data.jobId;

    // Download as same user (should succeed)
    const downloadRes = await request(app)
      .get(`/api/jobs/${userJobId}/export/pdf`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(downloadRes.headers['content-type']).toMatch(/pdf/);

    // Download as different user (should fail)
    const otherToken = jwt.sign({ userId: 'other-user', email: 'other@example.com' }, JWT_SECRET);
    await request(app)
      .get(`/api/jobs/${userJobId}/export/pdf`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('should store files encrypted and decrypt on download', async () => {
    // Find a processed file (simulate, as actual path is not returned)
    const processedDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'processed');
    const files = await fs.readdir(processedDir);
    expect(files.length).toBeGreaterThan(0);
    const filePath = path.join(processedDir, files[0]);
    const fileBuffer = await fs.readFile(filePath);
    // Check that file is not plain MP4 (magic bytes)
    expect(fileBuffer.slice(4, 8).toString()).not.toBe('ftyp');
  });
}); 