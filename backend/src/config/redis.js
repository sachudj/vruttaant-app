const Redis = require('ioredis');

let client = null;
let _isConnected = false;

/**
 * Create and connect the Redis client.
 * If REDIS_URL is not set the module operates in no-op (disabled) mode so the
 * rest of the application never breaks when Redis is absent.
 */
function connectRedis() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('[redis] REDIS_URL not set. Cache disabled – running without Redis.');
    return null;
  }

  const instance = new Redis(redisUrl, {
    // Fail fast rather than queuing thousands of commands during an outage
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    // Reconnect with capped back-off so the app never stalls
    retryStrategy(times) {
      if (times > 10) {
        console.error('[redis] Giving up reconnecting after 10 attempts.');
        return null; // stop retrying
      }
      return Math.min(times * 200, 3000);
    }
  });

  instance.on('connect', () => {
    _isConnected = true;
    console.log('[redis] Connected.');
  });

  instance.on('ready', () => {
    _isConnected = true;
  });

  instance.on('error', (err) => {
    // Only log – don't crash. The cacheService will degrade gracefully.
    console.error('[redis] Connection error:', err.message);
  });

  instance.on('close', () => {
    _isConnected = false;
  });

  instance.on('reconnecting', () => {
    _isConnected = false;
  });

  client = instance;
  return client;
}

function getRedisClient() {
  return client;
}

function isRedisConnected() {
  return _isConnected && client !== null && client.status === 'ready';
}

async function closeRedis() {
  if (client) {
    await client.quit().catch(() => client.disconnect());
    client = null;
    _isConnected = false;
    console.log('[redis] Connection closed.');
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  closeRedis
};
