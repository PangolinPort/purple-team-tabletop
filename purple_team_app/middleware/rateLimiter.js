function rateLimit(maxRequests, windowMs) {
  const hits = new Map(); // ip => [timestamps]
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!hits.has(ip)) hits.set(ip, []);
    const buf = hits.get(ip);
    while (buf.length && now - buf[0] > windowMs) buf.shift();
    buf.push(now);
    if (buf.length > maxRequests) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
    next();
  };
}

module.exports = { rateLimit };
