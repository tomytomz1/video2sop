import request from 'supertest';
import app from '../app';

const validStandardUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const validShortUrl = 'https://youtu.be/jNQXAC9IVRw';
const invalidUrl = 'https://notyoutube.com/watch?v=123';
const malformedUrl = 'not-a-url';
const unreachableUrl = 'https://www.youtube.com/watch?v=invalid'; // Simulate unreachable/invalid video
const privateVideoUrl = 'https://www.youtube.com/watch?v=private123';
const regionLockedUrl = 'https://www.youtube.com/watch?v=regionlocked123';
const unavailableUrl = 'https://www.youtube.com/watch?v=unavailable123';
const rateLimitedUrl = 'https://www.youtube.com/watch?v=ratelimit123';

const cases = [
  {
    name: 'Valid standard YouTube URL',
    url: validStandardUrl,
    expectStatus: 201,
    expectSuccess: true,
  },
  {
    name: 'Valid short YouTube URL',
    url: validShortUrl,
    expectStatus: 201,
    expectSuccess: true,
  },
  {
    name: 'Invalid domain',
    url: invalidUrl,
    expectStatus: 400,
    expectSuccess: false,
  },
  {
    name: 'Malformed URL',
    url: malformedUrl,
    expectStatus: 400,
    expectSuccess: false,
  },
  {
    name: 'Unreachable/invalid YouTube video',
    url: unreachableUrl,
    expectStatus: 400,
    expectSuccess: false,
  },
  {
    name: 'Private YouTube video',
    url: privateVideoUrl,
    expectStatus: 400,
    expectSuccess: false,
    expectError: 'private',
  },
  {
    name: 'Region-locked YouTube video',
    url: regionLockedUrl,
    expectStatus: 400,
    expectSuccess: false,
    expectError: 'unavailable|region|blocked',
  },
  {
    name: 'Unavailable YouTube video',
    url: unavailableUrl,
    expectStatus: 400,
    expectSuccess: false,
    expectError: 'unavailable',
  },
  {
    name: 'Rate-limited YouTube video',
    url: rateLimitedUrl,
    expectStatus: 400,
    expectSuccess: false,
    expectError: 'unavailable|rate limit|too many requests',
  },
];

describe('POST /api/upload/youtube (E2E)', () => {
  let passCount = 0;
  let failCount = 0;

  cases.forEach(({ name, url, expectStatus, expectSuccess, expectError }) => {
    test(name, async () => {
      const res = await request(app)
        .post('/api/upload/youtube')
        .send({ url })
        .set('Accept', 'application/json');
      console.log(`\n[${name}]`);
      console.log('Request:', { url });
      console.log('Response:', res.status, res.body);
      try {
        expect(res.status).toBe(expectStatus);
        if (expectSuccess) {
          expect(res.body.status).toBe('success');
          expect(res.body.data).toHaveProperty('jobId');
        } else {
          expect(res.body.status || res.body.error).toBeDefined();
          if (expectError) {
            expect(JSON.stringify(res.body)).toMatch(new RegExp(expectError, 'i'));
          }
        }
        console.log('PASS');
        passCount++;
      } catch (err) {
        const error = err as Error;
        console.error('FAIL:', error.message);
        failCount++;
        throw error;
      }
    }, 30000);
  });

  afterAll(() => {
    console.log(`\nTest Summary: ${passCount} PASSED, ${failCount} FAILED, ${cases.length} TOTAL`);
  });
}); 