import supertest from 'supertest';
import app from '../app';
import fs from 'fs/promises';
import path from 'path';
const { JobService } = require('../services/job.service');
const jobService = new JobService();

describe('Image Embedding Integration', () => {
  let jobId: string;

  it('should create a job, process it, and download the embedded image', async () => {
    // 1. Create a job
    const { id } = await jobService.createJob('http://example.com/dummy.mp4', 'FILE');
    jobId = id;

    // 2. Simulate job processing (directly update job metadata and generate embedded image)
    const imageContent = Buffer.from('fake image data');
    const imagePath = path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), 'exports', `${jobId}.png`);
    await fs.mkdir(path.dirname(imagePath), { recursive: true });
    await fs.writeFile(imagePath, imageContent);
    await jobService.updateJobMetadata(jobId, { imagePath });

    // 3. Download the embedded image
    const res = await supertest(app)
      .get(`/api/jobs/${jobId}/export/image`)
      .expect(200);
    expect(res.header['content-type']).toBe('image/png');
    expect(res.body).toEqual(imageContent);

    // 4. Clean up
    await fs.unlink(imagePath);
  });
}); 