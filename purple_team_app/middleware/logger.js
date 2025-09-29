const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logDir = path.join(__dirname, '..', 'logs');
const transport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'access-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [transport]
});


function safePath(url) {
  try {
    const u = new URL(url, 'http://local'); // base to parse relative paths
    return u.pathname; // drop querystring entirely to avoid PII leakage
  } catch {
    return url.split('?')[0];
  }
}

function requestLogger(req, res, next) {
  const start = Date.now();
  const userId = req.user ? req.user.id : 'anonymous';
  res.on('finish', () => {
    logger.info({
      ts: new Date().toISOString(),
      method: req.method,
      path: safePath(req.originalUrl),
      status: res.statusCode,
      user: userId,
      duration_ms: Date.now() - start
    });
  });
  next();
}

const REDACT_HEADERS = ['authorization','cookie','set-cookie'];
module.exports = { requestLogger, logger };
