import supertest from 'supertest';
import app from '../app';
import fs from 'fs/promises';
import path from 'path';
const { JobService } = require('../services/job.service');
const jobService = new JobService();

describe('PDF Export Integration', () => {
  let jobId: string;

  it('should create a job, process it, and download the PDF', async () => {
    // 1. Create a job
    const { id } = await jobService.createJob('http://example.com/dummy.mp4', 'FILE');
    jobId = id;

    // 2. Simulate job processing (directly update job metadata and generate PDF)
    // In a real test, you would let the worker run, but for speed, we'll mock it:
    const sopHtml = '<h1>Test SOP</h1><p>This is a test SOP for PDF export.</p>';
    const SOPService = require('../services/sop.service').SOPService;
    const sopService = new SOPService();
    const pdfPath = await sopService.exportSOPToPDF(jobId, sopHtml);
    // Update job metadata to include pdfPath
    await jobService.updateJobMetadata(jobId, { pdfPath });

    // 3. Download the PDF
    const res = await supertest(app)
      .get(`/api/jobs/${jobId}/export/pdf`)
      .expect(200);
    expect(res.header['content-type']).toBe('application/pdf');
    // Check PDF file signature (first 4 bytes: %PDF)
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');

    // 4. Clean up
    await fs.unlink(pdfPath);
  });
}); 