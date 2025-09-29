const request = require('supertest');
const app = require('../../app');

describe('Security headers and CORS defaults', () => {
  test('helmet sets baseline headers', async () => {
    const res = await request(app).get('/privacy');
    expect(res.status).toBe(200);
    // Common helmet headers (implementation-dependent but these two should exist)
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  test('CORS is disabled by default (no wildcard)', async () => {
    const res = await request(app).get('/privacy').set('Origin', 'http://evil.example');
    // If disabled, Access-Control-Allow-Origin should be undefined or falsey—not "*"
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});