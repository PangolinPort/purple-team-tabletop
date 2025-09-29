const request = require('supertest');
const app = require('../app');

describe('Scenarios API', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'testsecret';
  });
  test('cannot create scenario without token', async () => {
    const res = await request(app)
      .post('/api/scenarios')
      .send({ title: 'Test Scenario' });
    expect(res.status).toBe(401);
  });
  test('cannot list scenarios without token', async () => {
    const res = await request(app)
      .get('/api/scenarios');
    expect(res.status).toBe(401);
  });
});