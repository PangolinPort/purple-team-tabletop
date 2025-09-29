const Redis = require('ioredis');

let client = null;

function getRedis() {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client = new Redis(url, {
    family: 4,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
  });
  client.on('error', (e) => console.error('Redis error', e.message));
  return client;
}

module.exports = { getRedis };
