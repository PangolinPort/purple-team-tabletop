const express = require('express');
const request = require('supertest');
const { validateRegistration } = require('../../middleware/validate');

describe('Strict validation rejects unknown fields', () => {
  const app = express();
  app.use(express.json());
  app.post('/register', validateRegistration, (req, res) => res.json({ ok: true }));

  test('unknown props yield 400', async () => {
    const res = await request(app).post('/register').send({
      username: 'alpha', email: 'a@b.com', password: 'verystrongpass',
      role: 'observer', admin: true
    });
    expect(res.status).toBe(400);
  });
});