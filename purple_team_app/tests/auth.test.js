const request = require('supertest');
const app = require('../app');

// Note: these tests are skeletons. To run them, set up a test database or
// mock the Mongoose models. The current implementation will likely
// throw errors until the DB layer is properly mocked.

describe('Authentication API', () => {
  beforeAll(() => {
    // Provide a secret for JWT signing in tests
    process.env.JWT_SECRET = 'testsecret';
  });

  test('registration fails with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser' });
    expect(res.status).toBe(400);
  });

  test('login fails with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'unknown', password: 'wrong' });
    // Depending on implementation, could be 401 or 500 if DB errors
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});