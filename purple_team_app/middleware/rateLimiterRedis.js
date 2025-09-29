const { RateLimiterRedis } = require('rate-limiter-flexible');
const { getRedis } = require('../config/redis');

const inmemoryBuckets = new Map();

function cleanOld(now, duration) {
  for (const [k, v] of inmemoryBuckets.entries()) {
    if (now - v.ts > duration * 1000) inmemoryBuckets.delete(k);
  }
}

function makeLimiter(points, duration) {
  const redis = getRedis();
  if (!redis) return null;
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl',
    points,
    duration,
    inmemoryBlockOnConsumed: points + 1,
    insuranceLimiter: null
  });
}

function useRateLimit(points, duration) {
  const limiter = makeLimiter(points, duration);
  if (!limiter) {
    // in-memory naive bucket fallback
    return (req, res, next) => {
      const key = req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      cleanOld(now, duration);
      const b = inmemoryBuckets.get(key) || { count: 0, ts: now };
      if (now - b.ts > duration * 1000) { b.count = 0; b.ts = now; }
      b.count += 1;
      inmemoryBuckets.set(key, b);
      if (b.count > points) {
        const retrySecs = Math.ceil((duration * 1000 - (now - b.ts)) / 1000);
        res.set('Retry-After', String(retrySecs));
        return res.status(429).json({ error: 'Too many requests' });
      }
      next();
    };
  }
  return async (req, res, next) => {
    try {
      const key = req.ip || req.connection?.remoteAddress || 'unknown';
      await limiter.consume(key);
      next();
    } catch (rej) {
      const retrySecs = Math.round(rej.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(retrySecs));
      return res.status(429).json({ error: 'Too many requests' });
    }
  };
}

module.exports = { useRateLimit };