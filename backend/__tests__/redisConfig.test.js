// Test the Redis config module behaviour (connect / no-op / state flags)

describe('redis config', () => {
  let originalRedisUrl;

  beforeAll(() => {
    originalRedisUrl = process.env.REDIS_URL;
  });

  afterAll(() => {
    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
  });

  beforeEach(() => {
    // Reset module registry so each test gets a fresh instance
    jest.resetModules();
  });

  it('operates in no-op mode when REDIS_URL is not set', () => {
    delete process.env.REDIS_URL;
    const { connectRedis, getRedisClient, isRedisConnected } = require('../src/config/redis');

    const client = connectRedis();

    expect(client).toBeNull();
    expect(getRedisClient()).toBeNull();
    expect(isRedisConnected()).toBe(false);
  });

  it('exports closeRedis function', () => {
    delete process.env.REDIS_URL;
    const { closeRedis } = require('../src/config/redis');
    expect(typeof closeRedis).toBe('function');
  });

  it('closeRedis is a no-op when client is null', async () => {
    delete process.env.REDIS_URL;
    const { connectRedis, closeRedis } = require('../src/config/redis');
    connectRedis(); // no-op, client remains null
    await expect(closeRedis()).resolves.not.toThrow();
  });

  it('isRedisConnected returns false before connect is called', () => {
    delete process.env.REDIS_URL;
    const { isRedisConnected } = require('../src/config/redis');
    expect(isRedisConnected()).toBe(false);
  });
});
