import supertest from 'supertest';
import app from '../app';
import fs from 'fs/promises';
import path from 'path';
const { JobService } = require('../services/job.service');
const jobService = new JobService();

describe('Markdown Export Integration', () => {
  let jobId: string;

  it('should create a job, process it, and download the Markdown', async () => {
    // 1. Create a job
    const { id } = await jobService.createJob('http://example.com/dummy.mp4', 'FILE');
    jobId = id;

    // 2. Simulate job processing (directly update job metadata and generate Markdown)
    const markdownContent = '# Test Markdown\nThis is a test markdown for export.';
    const markdownPath = path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), 'exports', `${jobId}.md`);
    await fs.mkdir(path.dirname(markdownPath), { recursive: true });
    await fs.writeFile(markdownPath, markdownContent);
    await jobService.updateJobMetadata(jobId, { markdownPath });

    // 3. Download the Markdown
    const res = await supertest(app)
      .get(`/api/jobs/${jobId}/export/markdown`)
      .expect(200);
    expect(res.header['content-type']).toBe('text/markdown; charset=UTF-8');
    expect(res.text).toBe(markdownContent);

    // 4. Clean up
    await fs.unlink(markdownPath);
  });
}); 