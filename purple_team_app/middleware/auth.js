const jwt = require('jsonwebtoken');
const verifyOpts = {
  algorithms: ['HS256'],
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
  clockTolerance: 90,
};
const { isJtiBlacklisted } = require('../utils/security');
const { getSecretByKid } = require('../config/jwtKeys');

function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const parts = header.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token format' });
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme) || !token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = decodedHeader?.header?.kid || 'default';
    const secret = getSecretByKid(kid);
    if (!secret) return res.status(401).json({ error: 'Invalid token' });
    const payload = jwt.verify(token, secret, { ...{ algorithms: ['HS256'] }, ...verifyOpts });
    if (payload.jti && isJtiBlacklisted) {
      // best-effort: if blacklisted, reject
      // isJtiBlacklisted may be async; support both
      const maybePromise = isJtiBlacklisted(payload.jti);
      if (maybePromise && typeof maybePromise.then === 'function') {
        return maybePromise.then(isBlk => {
          if (isBlk) return res.status(401).json({ error: 'Token revoked' });
          req.user = { id: payload.id || payload.sub, role: payload.role || 'observer' };
          return next();
        }).catch(() => res.status(401).json({ error: 'Token error' }));
      }
      if (maybePromise) {
        if (maybePromise === true) return res.status(401).json({ error: 'Token revoked' });
      }
    }
    req.user = { id: payload.id || payload.sub, role: payload.role || 'observer' };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || (allowed.length && !allowed.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };