const request = require('supertest');

const mockChain = {
  sort: jest.fn(),
  skip: jest.fn(),
  limit: jest.fn(),
  lean: jest.fn()
};

// Separate lean mock for fingerprint dedup query (returns [] = no existing fingerprints)
const mockFingerprintChain = {
  lean: jest.fn().mockResolvedValue([])
};

jest.mock('../src/services/newsIngestionService', () => ({
  fetchNewsCards: jest.fn()
}));

jest.mock('../src/models/NewsCard', () => ({
  bulkWrite: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  isDatabaseConnected: jest.fn(),
  getConnection: jest.fn(() => ({ readyState: 1 }))
}));

const { fetchNewsCards } = require('../src/services/newsIngestionService');
const NewsCard = require('../src/models/NewsCard');
const { isDatabaseConnected } = require('../src/config/database');
const { app } = require('../src/index');

function expectExactKeys(object, expectedKeys) {
  expect(Object.keys(object).sort()).toEqual([...expectedKeys].sort());
}

describe('API contract', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // Keep error payloads deterministic (no stack field in production mode).
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockChain.sort.mockReturnValue(mockChain);
    mockChain.skip.mockReturnValue(mockChain);
    mockChain.limit.mockReturnValue(mockChain);
    mockChain.lean.mockResolvedValue([]);

    NewsCard.find.mockReturnValue(mockChain);

    isDatabaseConnected.mockReturnValue(true);
    NewsCard.countDocuments.mockResolvedValue(0);
  });

  it('keeps POST /api/v1/news/ingest success response shape stable', async () => {
    // For the ingest path, the first find() call is the fingerprint dedup query.
    NewsCard.find
      .mockReturnValueOnce(mockFingerprintChain)
      .mockReturnValue(mockChain);

    fetchNewsCards.mockResolvedValue({
      sourceUrl: 'https://example.com/news',
      language: 'en',
      totalFound: 1,
      cards: [
        {
          title: 'Title',
          summary: 'Summary',
          aiSummary: 'AI Summary',
          category: 'General',
          imageUrl: 'https://example.com/image.jpg',
          source: 'Example',
          url: 'https://example.com/article',
          language: 'en',
          publishedAt: null,
          titleFingerprint: 'title',
          rawMetadata: { selectorMatched: true }
        }
      ]
    });
    NewsCard.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 });

    const response = await request(app)
      .post('/api/v1/news/ingest')
      .send({
        url: 'https://example.com/news',
        language: 'en',
        maxItems: 5,
        persist: true
      });

    expect(response.statusCode).toBe(200);
    expectExactKeys(response.body, [
      'message',
      'sourceUrl',
      'language',
      'scrapedCount',
      'persistedCount',
      'dedupSkippedCount',
      'dbStatus',
      'cardsPreview'
    ]);

    expect(typeof response.body.message).toBe('string');
    expect(typeof response.body.sourceUrl).toBe('string');
    expect(typeof response.body.language).toBe('string');
    expect(typeof response.body.scrapedCount).toBe('number');
    expect(typeof response.body.persistedCount).toBe('number');
    expect(typeof response.body.dedupSkippedCount).toBe('number');
    expect(typeof response.body.dbStatus).toBe('string');
    expect(Array.isArray(response.body.cardsPreview)).toBe(true);

    expectExactKeys(response.body.cardsPreview[0], [
      'title',
      'summary',
      'aiSummary',
      'category',
      'imageUrl',
      'source',
      'url',
      'language',
      'publishedAt',
      'titleFingerprint',
      'rawMetadata'
    ]);
  });

  it('keeps GET /api/v1/news/cards success response shape stable', async () => {
    mockChain.lean.mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Card 1',
        category: 'Business',
        language: 'en'
      }
    ]);
    NewsCard.countDocuments.mockResolvedValue(3);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ language: 'en', page: '1', limit: '2' });

    expect(response.statusCode).toBe(200);
    expectExactKeys(response.body, [
      'message',
      'page',
      'limit',
      'total',
      'totalPages',
      'hasMore',
      'filters',
      'cards'
    ]);

    expectExactKeys(response.body.filters, ['language', 'category']);
    expect(typeof response.body.page).toBe('number');
    expect(typeof response.body.limit).toBe('number');
    expect(typeof response.body.total).toBe('number');
    expect(typeof response.body.totalPages).toBe('number');
    expect(typeof response.body.hasMore).toBe('boolean');
    expect(Array.isArray(response.body.cards)).toBe(true);
  });

  it('keeps validation error envelope shape stable for bad ingest requests', async () => {
    const response = await request(app)
      .post('/api/v1/news/ingest')
      .send({ url: 'not-a-valid-url' });

    expect(response.statusCode).toBe(400);
    expectExactKeys(response.body, ['success', 'error']);
    expect(response.body.success).toBe(false);

    expectExactKeys(response.body.error, ['statusCode', 'message', 'details', 'requestId']);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toBe('Validation failed.');
    expect(Array.isArray(response.body.error.details)).toBe(true);
    expect(typeof response.body.error.requestId).toBe('string');
  });

  it('keeps 5xx error envelope shape stable for /api/v1/news/cards when db is down', async () => {
    isDatabaseConnected.mockReturnValue(false);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ language: 'en' });

    expect(response.statusCode).toBe(503);
    expectExactKeys(response.body, ['success', 'error']);
    expect(response.body.success).toBe(false);

    expectExactKeys(response.body.error, ['statusCode', 'message', 'requestId']);
    expect(response.body.error.statusCode).toBe(503);
    expect(response.body.error.message).toBe('Internal server error.');
    expect(typeof response.body.error.requestId).toBe('string');
  });
});
