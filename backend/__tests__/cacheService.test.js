const {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidatePattern,
  buildCardsKey,
  buildRecommendedKey,
  buildTrendingKey,
  buildCategoriesKey,
  TTL
} = require('../src/services/cacheService');

// Mock the redis config module
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConnected: jest.fn()
}));

const { getRedisClient, isRedisConnected } = require('../src/config/redis');

describe('cacheService', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn()
    };
    getRedisClient.mockReturnValue(mockRedis);
  });

  // ─── TTL constants ────────────────────────────────────────────────────────

  describe('TTL defaults', () => {
    it('has sensible default values', () => {
      expect(TTL.NEWS_CARDS).toBeGreaterThan(0);
      expect(TTL.RECOMMENDED).toBeGreaterThan(0);
      expect(TTL.ANALYTICS_TRENDING).toBeGreaterThan(0);
      expect(TTL.ANALYTICS_CATEGORIES).toBeGreaterThan(0);
    });

    it('NEWS_CARDS TTL is longer than RECOMMENDED TTL', () => {
      expect(TTL.NEWS_CARDS).toBeGreaterThan(TTL.RECOMMENDED);
    });
  });

  // ─── cacheGet ─────────────────────────────────────────────────────────────

  describe('cacheGet', () => {
    it('returns null when Redis is not connected', async () => {
      isRedisConnected.mockReturnValue(false);
      const result = await cacheGet('some:key');
      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('returns null on cache miss', async () => {
      isRedisConnected.mockReturnValue(true);
      mockRedis.get.mockResolvedValue(null);
      const result = await cacheGet('missing:key');
      expect(result).toBeNull();
    });

    it('returns parsed value on cache hit', async () => {
      isRedisConnected.mockReturnValue(true);
      const payload = { cards: [{ id: 1 }], total: 1 };
      mockRedis.get.mockResolvedValue(JSON.stringify(payload));
      const result = await cacheGet('news:cards:en:::latest:1:20');
      expect(result).toEqual(payload);
    });

    it('returns null and logs error when redis throws', async () => {
      isRedisConnected.mockReturnValue(true);
      mockRedis.get.mockRejectedValue(new Error('Connection reset'));
      const result = await cacheGet('any:key');
      expect(result).toBeNull();
    });
  });

  // ─── cacheSet ─────────────────────────────────────────────────────────────

  describe('cacheSet', () => {
    it('is a no-op when Redis is not connected', async () => {
      isRedisConnected.mockReturnValue(false);
      await cacheSet('some:key', { data: 1 }, 300);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('stores JSON-serialised value with EX ttl', async () => {
      isRedisConnected.mockReturnValue(true);
      mockRedis.set.mockResolvedValue('OK');
      const payload = { cards: [], total: 0 };
      await cacheSet('news:cards:key', payload, 300);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'news:cards:key',
        JSON.stringify(payload),
        'EX',
        300
      );
    });

    it('silently swallows redis errors', async () => {
      isRedisConnected.mockReturnValue(true);
      mockRedis.set.mockRejectedValue(new Error('READONLY'));
      await expect(cacheSet('k', {}, 60)).resolves.not.toThrow();
    });
  });

  // ─── cacheDel ─────────────────────────────────────────────────────────────

  describe('cacheDel', () => {
    it('is a no-op when Redis is not connected', async () => {
      isRedisConnected.mockReturnValue(false);
      await cacheDel('some:key');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('deletes the key when connected', async () => {
      isRedisConnected.mockReturnValue(true);
      mockRedis.del.mockResolvedValue(1);
      await cacheDel('news:cards:en:::latest:1:20');
      expect(mockRedis.del).toHaveBeenCalledWith('news:cards:en:::latest:1:20');
    });
  });

  // ─── cacheInvalidatePattern ───────────────────────────────────────────────

  describe('cacheInvalidatePattern', () => {
    it('is a no-op when Redis is not connected', async () => {
      isRedisConnected.mockReturnValue(false);
      await cacheInvalidatePattern('news:cards:*');
      expect(mockRedis.scan).not.toHaveBeenCalled();
    });

    it('SCANs and deletes matching keys', async () => {
      isRedisConnected.mockReturnValue(true);
      // First scan returns 2 keys, second returns cursor '0' with no keys
      mockRedis.scan
        .mockResolvedValueOnce(['42', ['news:cards:en:::latest:1:20', 'news:cards:hi:::latest:1:20']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.del.mockResolvedValue(2);

      await cacheInvalidatePattern('news:cards:*');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith(
        'news:cards:en:::latest:1:20',
        'news:cards:hi:::latest:1:20'
      );
    });

    it('handles empty scan results without calling del', async () => {
      isRedisConnected.mockReturnValue(true);
      mockRedis.scan.mockResolvedValueOnce(['0', []]);
      await cacheInvalidatePattern('news:cards:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('silently swallows redis errors', async () => {
      isRedisConnected.mockReturnValue(true);
      mockRedis.scan.mockRejectedValue(new Error('SCAN failed'));
      await expect(cacheInvalidatePattern('news:cards:*')).resolves.not.toThrow();
    });
  });

  // ─── Key builders ─────────────────────────────────────────────────────────

  describe('buildCardsKey', () => {
    it('generates deterministic key for anonymous request', () => {
      const key = buildCardsKey({ language: 'en', category: '', q: '', sort: 'latest', page: 1, limit: 20 });
      expect(key).toBe('news:cards:anon:en:::latest:1:20');
    });

    it('includes category and query in key', () => {
      const key = buildCardsKey({ language: 'hi', category: 'Tech', q: 'ai', sort: 'relevance', page: 2, limit: 10 });
      expect(key).toBe('news:cards:anon:hi:Tech:ai:relevance:2:10');
    });

    it('includes user id for personalized requests', () => {
      const key = buildCardsKey({ language: 'en', category: 'Science', q: '', sort: 'trending', page: 1, limit: 20, userId: 'user123' });
      expect(key).toBe('news:cards:user123:en:Science::trending:1:20');
    });
  });

  describe('buildRecommendedKey', () => {
    it('generates anon key when no userId', () => {
      const key = buildRecommendedKey({ userId: undefined, language: 'en', page: 1, limit: 20, diversityState: 'none' });
      expect(key).toBe('news:recommended:anon:en:1:20:none');
    });

    it('generates user-specific key', () => {
      const key = buildRecommendedKey({ userId: 'user123', language: 'hi', page: 1, limit: 20, diversityState: 'tech:2,business:1' });
      expect(key).toBe('news:recommended:user123:hi:1:20:tech:2,business:1');
    });
  });

  describe('buildTrendingKey', () => {
    it('generates key with limit', () => {
      expect(buildTrendingKey({ limit: 20 })).toBe('analytics:trending:20');
    });

    it('uses default limit when not provided', () => {
      expect(buildTrendingKey({})).toBe('analytics:trending:10');
    });
  });

  describe('buildCategoriesKey', () => {
    it('generates key with limit', () => {
      expect(buildCategoriesKey({ limit: 5 })).toBe('analytics:categories:5');
    });

    it('uses default limit when not provided', () => {
      expect(buildCategoriesKey({})).toBe('analytics:categories:10');
    });
  });
});
