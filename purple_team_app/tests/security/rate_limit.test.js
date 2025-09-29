const request = require('supertest');
const express = require('express');
const { useRateLimit } = require('../../middleware/rateLimiterRedis');

describe('Rate limiter blocks burst traffic', () => {
  const app = express();
  app.get('/rl', useRateLimit(3, 60), (req, res) => res.json({ ok: true }));

  test('returns 429 after limit', async () => {
    let last;
    for (let i=0;i<4;i++) {
      last = await request(app).get('/rl').set('X-Forwarded-For', '1.2.3.4');
    }
    expect(last.status).toBe(429);
  });
});