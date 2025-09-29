const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { getRedis } = require('../config/redis');
const { getActiveKid, getSecretByKid } = require('../config/jwtKeys');

const JWT_ALG = 'HS256';

function signJwt(payload) {
  const jti = uuidv4();
  const kid = getActiveKid();
  const secret = getSecretByKid(kid);
  if (!secret) throw new Error('No JWT secret for active kid');
  const token = jwt.sign(
    { ...payload, jti },
    secret,
    {
      expiresIn: '1h',
      algorithm: JWT_ALG,
      issuer: process.env.JWT_ISS || 'purple-team-app',
      audience: process.env.JWT_AUD || 'purple-team-clients',
      header: { kid }
    }
  );
  return { token, jti, kid };
}

async function blacklistJti(jti, expSeconds = 3600) {
  const redis = getRedis();
  if (!redis) return false;
  const key = `jwt:blacklist:${jti}`;
  await redis.set(key, '1', 'EX', expSeconds);
  return true;
}

async function isJtiBlacklisted(jti) {
  const redis = getRedis();
  if (!redis) return false;
  const key = `jwt:blacklist:${jti}`;
  const val = await redis.get(key);
  return !!val;
}

// Refresh token helpers (opaque tokens)
function refreshKey(userId) {
  return `refresh:${userId}`;
}

// Store a family of refresh tokens; only the last tokenId is valid (rotation)
async function issueRefreshToken(userId) {
  const redis = getRedis();
  if (!redis) return null;
  const tokenId = uuidv4().replace(/-/g, '');
  const token = uuidv4().replace(/-/g, '');
  const ttl = 30 * 24 * 3600; // 30 days
  // Store latest tokenId and token hash
  const hash = require('crypto').createHash('sha256').update(token).digest('hex');
  await redis.hset(refreshKey(userId), { tokenId, hash });
  await redis.expire(refreshKey(userId), ttl);
  return { token, tokenId, ttl };
}

async function rotateRefreshToken(userId, presentedToken) {
  const redis = getRedis();
  if (!redis) return { ok: false, reason: 'no_redis' };
  const data = await redis.hgetall(refreshKey(userId));
  if (!data || !data.hash || !data.tokenId) return { ok: false, reason: 'missing' };
  const hash = require('crypto').createHash('sha256').update(presentedToken).digest('hex');
  if (hash !== data.hash) {
    // reuse or invalid
    await redis.del(refreshKey(userId)); // revoke family
    return { ok: false, reason: 'reuse_detected' };
  }
  // rotate
  const next = await issueRefreshToken(userId);
  return { ok: true, next };
}

module.exports = {
  signJwt, blacklistJti, isJtiBlacklisted,
  issueRefreshToken, rotateRefreshToken
};
