require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const connectDB = require('./config/db');
const clientMetrics = require('prom-client');
const { requestLogger } = require('./middleware/logger');
const { useRateLimit } = require('./middleware/rateLimiterRedis');

const authRoutes = require('./routes/auth');
const scenarioRoutes = require('./routes/scenarios');

const app = express();

// Trust reverse proxy for accurate req.ip / proto
app.set('trust proxy', true);
// Hide Express signature
app.disable('x-powered-by');

// Security headers
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' }
}));

// CORS: explicitly whitelist if provided; otherwise block cross-origin by default
const corsOptions = {};
if (process.env.CORS_ORIGIN) {
  corsOptions.origin = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
} else {
  corsOptions.origin = false; // disable cross-origin unless specified
}
const _corsAllow = (process.env.CORS_ALLOW || '')
  .split(',')
  .map(s=>s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (_corsAllow.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));


app.use(express.json({ limit: '512kb' })); // constrain payload size
app.use(requestLogger);
app.use(useRateLimit(300, 15 * 60));
// Prometheus metrics
clientMetrics.collectDefaultMetrics();
app.get('/metrics', (req, res) => {
        const token = req.headers['x-metrics-token'];
        if (!process.env.METRICS_TOKEN || token !== process.env.METRICS_TOKEN) return res.status(403).end();
  res.set('Content-Type', clientMetrics.register.contentType);
  res.end(clientMetrics.register.metrics());
});

// Privacy policy endpoint (static placeholder)
app.get('/privacy', (req, res) => {
  res.type('text/plain').send('Privacy Policy: minimal PII, hashed passwords, JWTs, 30-day scenario retention. Detailed policy to be published.');
});

// HSTS only in production over TLS
if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({ maxAge: 63072000, includeSubDomains: true, preload: false }));
}


// Enforce HTTPS in production when behind a proxy
if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    if (proto !== 'https') {
      return res.status(400).json({ error: 'HTTPS required' });
    }
    next();
  });
}


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scenarios', scenarioRoutes);


// Health endpoint
app.get('/healthz', async (req, res) => {
  const mongoose = require('mongoose');
  const { getRedis } = require('./config/redis');
  const r = getRedis();
  const dbOk = mongoose.connection.readyState === 1; // connected
  const redisOk = r ? r.status === 'ready' || r.status == 'connect' : true;
  if (dbOk && redisOk) return res.status(200).json({ ok: true });
  return res.status(503).json({ ok: false, dbOk, redisOk });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler (no stack traces in prod)
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Server error' });
});

async function startServer() {
  const PORT = process.env.PORT || 3000;

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not set in environment variables');
    process.exit(1);
  }
  if (process.env.MONGO_URI) {
    await connectDB(process.env.MONGO_URI);
  } else {
    console.warn('MONGO_URI not set – running without database (most features will fail)');
  }
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

if (require.main === module) {
  startServer();
}

module.exports = app;
