const { getRedisClient, isRedisConnected } = require('../config/redis');

// Default TTLs (seconds)
const TTL = {
  NEWS_CARDS: Number(process.env.CACHE_TTL_NEWS_CARDS) || 180,       // 3 min
  RECOMMENDED: Number(process.env.CACHE_TTL_RECOMMENDED) || 90,      // 1.5 min
  ANALYTICS_TRENDING: Number(process.env.CACHE_TTL_ANALYTICS) || 300, // 5 min
  ANALYTICS_CATEGORIES: Number(process.env.CACHE_TTL_ANALYTICS) || 300
};

/**
 * Get a cached value. Returns null on miss or when Redis is unavailable.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function cacheGet(key) {
  if (!isRedisConnected()) return null;
  try {
    const raw = await getRedisClient().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[cache] get error:', err.message);
    return null;
  }
}

/**
 * Store a value in the cache with a TTL.
 * Silently no-ops when Redis is unavailable.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
async function cacheSet(key, value, ttlSeconds) {
  if (!isRedisConnected()) return;
  try {
    await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[cache] set error:', err.message);
  }
}

/**
 * Delete a specific cache key.
 * @param {string} key
 */
async function cacheDel(key) {
  if (!isRedisConnected()) return;
  try {
    await getRedisClient().del(key);
  } catch (err) {
    console.error('[cache] del error:', err.message);
  }
}

/**
 * Delete all keys matching a glob pattern using SCAN (non-blocking).
 * @param {string} pattern  e.g. "news:cards:*"
 */
async function cacheInvalidatePattern(pattern) {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('[cache] invalidate pattern error:', err.message);
  }
}

/**
 * Build a cache key for the news/cards endpoint.
 * Uses only anonymous-safe parameters; personalized requests skip the cache.
 */
function buildCardsKey({ language, category, q, sort, page, limit, userId }) {
  const cat = category || '';
  const query = q || '';
  const uid = userId || 'anon';
  return `news:cards:${uid}:${language}:${cat}:${query}:${sort}:${page}:${limit}`;
}

/**
 * Build a cache key for the news/recommended endpoint.
 */
function buildRecommendedKey({ userId, language, page, limit, diversityState }) {
  const uid = userId || 'anon';
  const locale = language || 'en';
  const diversity = diversityState || 'none';
  return `news:recommended:${uid}:${locale}:${page}:${limit}:${diversity}`;
}

/**
 * Build a cache key for analytics/trending.
 */
function buildTrendingKey({ limit }) {
  return `analytics:trending:${limit || 10}`;
}

/**
 * Build a cache key for analytics/categories.
 */
function buildCategoriesKey({ limit }) {
  return `analytics:categories:${limit || 10}`;
}

module.exports = {
  TTL,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidatePattern,
  buildCardsKey,
  buildRecommendedKey,
  buildTrendingKey,
  buildCategoriesKey
};
