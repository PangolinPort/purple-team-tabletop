const express = require('express');
const request = require('supertest');
const { validateScenario } = require('../../middleware/validate');

describe('XSS scrub removes angle brackets from strings', () => {
  const app = express();
  app.use(express.json());
  app.post('/scenario', validateScenario, (req, res) => res.json(req.body));

  test('sanitizes dangerous characters', async () => {
    const res = await request(app).post('/scenario').send({
      title: '<script>alert(1)</script>',
      description: 'ok',
      steps: [{ title: 't', description: '<img src=x onerror=alert(1)>' }]
    });
    expect(res.status).toBe(200);
    expect(res.body.title.includes('<')).toBe(false);
    expect(res.body.steps[0].description.includes('<')).toBe(false);
  });
});