const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create a tiny app that mounts only auth middleware-protected route
const { authenticate } = require('../../middleware/auth');

const app = express();
app.get('/protected', authenticate, (req, res) => res.json({ ok: true, sub: req.user.id, role: req.user.role }));

function makeToken(alg='HS256', kid='default', secret='testsecret', payload={ id: 'u1', role: 'observer' }) {
  const header = { alg, typ: 'JWT', kid };
  const token = jwt.sign(payload, secret, { algorithm: alg, header, expiresIn: '5m', jwtid: 'j1' });
  return token;
}

describe('JWT algorithm enforcement and kid-based verification', () => {
  test('rejects tokens not signed with HS256', async () => {
    process.env.JWT_SECRET = 'testsecret';
    const bad = makeToken('HS512'); // should be rejected
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  test('accepts HS256 with correct kid secret', async () => {
    process.env.JWT_KEYS_JSON = JSON.stringify({ default: 'testsecret' });
    const good = makeToken('HS256');
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${good}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});