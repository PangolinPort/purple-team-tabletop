const express = require('express');
const User = require('../models/user');
const { validateRegistration, validateLogin } = require('../middleware/validate');
const { useRateLimit } = require('../middleware/rateLimiterRedis');
const { signJwt, blacklistJti, issueRefreshToken, rotateRefreshToken } = require('../utils/security');
const zxcvbn = require('zxcvbn');
const speakeasy = require('speakeasy');

const router = express.Router();
const { appendAudit } = require('../utils/audit');

// Register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(409).json({ error: 'username or email already registered' });

    // Password strength
    const strength = zxcvbn(password);
    if (strength.score < 3) {
      return res.status(400).json({ error: 'password too weak (score < 3)' });
    }

    // Optional admin MFA bootstrap: if role is admin and MFA_ENFORCE_ADMIN=true, generate TOTP secret and require activation later
    const user = new User({ username, email, password, role: role || 'observer' });
    if (user.role === 'admin' && process.env.MFA_ENFORCE_ADMIN === 'true') {
      user.mfaSecret = speakeasy.generateSecret({ length: 20 }).base32;
    }
    await user.save();
    const safe = user.toJSON();
    if (safe.mfaSecret) safe.mfaSecret = 'PROVISIONED'; // do not leak
    await appendAudit({ userId: user._id.toString(), action: 'register', target: 'user', details: { username } });
    return res.status(201).json({ user: safe });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Login (rate-limited) + MFA for admin if enforced
// replaced by enhanced login with refresh


// Issue refresh token at login
router.post('/login', useRateLimit(5, 15 * 60), validateLogin, async (req, res) => {
  try {
    const { username, password, totp } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role === 'admin' && process.env.MFA_ENFORCE_ADMIN === 'true') {
      if (!user.mfaSecret) return res.status(403).json({ error: 'MFA not provisioned; contact administrator' });
      if (!totp) return res.status(401).json({ error: 'TOTP required' });
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: totp, window: 1 });
      if (!verified) return res.status(401).json({ error: 'Invalid TOTP' });
    }

    const { token } = signJwt({ id: user._id.toString(), role: user.role });
    const refresh = await issueRefreshToken(user._id.toString());
    await appendAudit({ userId: user._id.toString(), action: 'login', target: 'user', details: {} });
        return res.json({ token, refreshToken: refresh ? refresh.token : null });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Refresh token rotation
router.post('/refresh', useRateLimit(120, 60 * 60), async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const result = await rotateRefreshToken(refreshToken);
    if (!result.ok) return res.status(401).json({ error: 'Invalid or reused refresh token' });
    const uid = result.userId;
    const user = await User.findById(uid);
    if (!user) return res.status(401).json({ error: 'Invalid user' });
    const { token } = signJwt({ id: uid, role: user.role });
    return res.json({ token, refreshToken: result.next.token });
  } catch (e) {
    console.error('refresh error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});
    const result = await rotateRefreshToken(userId, refreshToken);
    if (!result.ok) {
      return res.status(401).json({ error: 'Invalid or reused refresh token' });
    }
    const { token } = signJwt({ id: userId, role: (await User.findById(userId)).role });
    return res.json({ token, refreshToken: result.next.token });
  } catch (e) {
    console.error('refresh error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Change password
const { authenticate } = require('../middleware/auth');
router.post('/change-password', authenticate, useRateLimit(20, 60*60), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'missing fields' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const zxcvbn = require('zxcvbn');
    if (zxcvbn(newPassword).score < 3) return res.status(400).json({ error: 'password too weak' });
    user.password = newPassword;
    await user.save();
    const { appendAudit } = require('../utils/audit');
    await appendAudit({ userId: user._id.toString(), action: 'change_password', target: 'user', details: {} });
    return res.json({ ok: true });
  } catch (e) { return res.status(500).json({ error: 'Server error' }); }
});
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const zxcvbn = require('zxcvbn');
    if (zxcvbn(newPassword).score < 3) return res.status(400).json({ error: 'password too weak' });
    user.password = newPassword;
    await user.save();
    await appendAudit({ userId: user._id.toString(), action: 'change_password', target: 'user', details: {} });
        return res.json({ ok: true });
  } catch (e) {
    console.error('change password error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Request password reset (issue token) – placeholder only, real impl requires email channel
router.post('/request-reset', useRateLimit(20, 60 * 60), async (req, res) => {
  // To implement: create a signed short-lived reset token and deliver via email channel
  return res.json({ ok: true });
});

// ORIGINAL router.post('/login', useRateLimit(5, 15 * 60), validateLogin, async (req, res) => {
  try {
    const { username, password, totp } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role === 'admin' && process.env.MFA_ENFORCE_ADMIN === 'true') {
      if (!user.mfaSecret) return res.status(403).json({ error: 'MFA not provisioned; contact administrator' });
      if (!totp) return res.status(401).json({ error: 'TOTP required' });
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: totp,
        window: 1
      });
      if (!verified) return res.status(401).json({ error: 'Invalid TOTP' });
    }

    const { token, jti } = signJwt({ id: user._id.toString(), role: user.role });
    return res.json({ token });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Logout: blacklist current token jti (client must send Authorization header)
router.post('/logout', async (req, res) => {
  try {
    const header = req.headers['authorization'];
    if (!header) return res.status(200).json({ ok: true });
    const parts = header.split(' ');
    if (parts.length !== 2) return res.status(200).json({ ok: true });
    const token = parts[1];
    const decoded = require('jsonwebtoken').decode(token);
    if (decoded && decoded.jti && decoded.exp) {
      const ttl = Math.max(1, decoded.exp - Math.floor(Date.now()/1000));
      await blacklistJti(decoded.jti, ttl);
    }
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

module.exports = router;
