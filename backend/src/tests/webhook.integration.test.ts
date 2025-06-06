import http from 'http';
import supertest from 'supertest';
import app from '../app';

const PORT = 5555;
const WEBHOOK_PATH = '/webhook-test';
const WEBHOOK_URL = `http://localhost:${PORT}${WEBHOOK_PATH}`;

describe('Webhook Notification Integration', () => {
  let server: http.Server;
  let receivedPayload: any = null;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === WEBHOOK_PATH) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          receivedPayload = JSON.parse(body);
          res.writeHead(200);
          res.end('ok');
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    }).listen(PORT, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should send a webhook notification when job status changes', async () => {
    // Create a job with the webhookUrl
    const response = await supertest(app)
      .post('/api/jobs')
      .send({
        videoUrl: 'http://example.com/dummy.mp4',
        type: 'file',
        webhookUrl: WEBHOOK_URL
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    const jobId = response.body.id;

    // Simulate job status update to COMPLETED
    await supertest(app)
      .post(`/api/jobs/${jobId}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    // Wait for the webhook to be received (with timeout)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Webhook not received in time')), 3000);
      (function waitForWebhook() {
        if (receivedPayload) {
          clearTimeout(timeout);
          resolve(undefined);
        } else {
          setTimeout(waitForWebhook, 100);
        }
      })();
    });

    // Assert webhook payload structure
    expect(receivedPayload).toHaveProperty('event', 'job.status_changed');
    expect(receivedPayload).toHaveProperty('job');
    expect(receivedPayload.job).toHaveProperty('id', jobId);
    expect(receivedPayload.job).toHaveProperty('status', 'COMPLETED');
    expect(receivedPayload.job).toHaveProperty('webhookUrl', WEBHOOK_URL);
  });
}); 