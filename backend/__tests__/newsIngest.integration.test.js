const request = require('supertest');

jest.mock('../src/services/newsIngestionService', () => ({
  fetchNewsCards: jest.fn()
}));

jest.mock('../src/models/NewsCard', () => ({
  bulkWrite: jest.fn(),
  find: jest.fn()
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

describe('news ingest integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid ingest payload', async () => {
    const response = await request(app)
      .post('/api/v1/news/ingest')
      .send({ url: 'not-a-valid-url' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        message: 'Validation failed.'
      }
    });
    expect(fetchNewsCards).not.toHaveBeenCalled();
  });

  it('ingests cards with persist=false and skips database writes', async () => {
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
          rawMetadata: {}
        }
      ]
    });

    const response = await request(app)
      .post('/api/v1/news/ingest')
      .send({
        url: 'https://example.com/news',
        language: 'en',
        maxItems: 5,
        persist: false
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      message: 'News ingestion completed.',
      sourceUrl: 'https://example.com/news',
      language: 'en',
      scrapedCount: 1,
      persistedCount: 0,
      dbStatus: 'skipped'
    });
    expect(Array.isArray(response.body.cardsPreview)).toBe(true);
    expect(response.body.cardsPreview).toHaveLength(1);
    expect(NewsCard.bulkWrite).not.toHaveBeenCalled();
  });

  it('persists cards when persist=true and database is connected', async () => {
    isDatabaseConnected.mockReturnValue(true);
    // Mock the fingerprint lookup: no existing fingerprints in DB
    NewsCard.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
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
          rawMetadata: {}
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
    expect(response.body).toMatchObject({
      message: 'News ingestion completed.',
      sourceUrl: 'https://example.com/news',
      language: 'en',
      scrapedCount: 1,
      persistedCount: 1,
      dedupSkippedCount: 0,
      dbStatus: 'saved'
    });
    expect(NewsCard.bulkWrite).toHaveBeenCalledTimes(1);
  });

  it('skips cross-source duplicate cards whose fingerprint already exists in DB', async () => {
    isDatabaseConnected.mockReturnValue(true);
    // Simulate: DB already has a card with the same fingerprint
    NewsCard.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ titleFingerprint: 'existing story fingerprint' }])
    });
    fetchNewsCards.mockResolvedValue({
      sourceUrl: 'https://othersource.com/news',
      language: 'en',
      totalFound: 2,
      cards: [
        {
          title: 'Existing Story Fingerprint',
          summary: '',
          aiSummary: '',
          category: 'General',
          imageUrl: '',
          source: 'Other',
          url: 'https://othersource.com/article-1',
          language: 'en',
          publishedAt: null,
          titleFingerprint: 'existing story fingerprint',
          rawMetadata: {}
        },
        {
          title: 'Brand New Story',
          summary: '',
          aiSummary: '',
          category: 'Tech',
          imageUrl: '',
          source: 'Other',
          url: 'https://othersource.com/article-2',
          language: 'en',
          publishedAt: null,
          titleFingerprint: 'brand new story',
          rawMetadata: {}
        }
      ]
    });
    NewsCard.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 });

    const response = await request(app)
      .post('/api/v1/news/ingest')
      .send({ url: 'https://othersource.com/news', language: 'en', persist: true });

    expect(response.statusCode).toBe(200);
    // 1 card was scraped but filtered as duplicate; only 1 new card was written
    expect(response.body.scrapedCount).toBe(2);
    expect(response.body.dedupSkippedCount).toBe(1);
    expect(response.body.persistedCount).toBe(1);
    expect(response.body.dbStatus).toBe('saved');
    // bulkWrite called with only the non-duplicate card
    const ops = NewsCard.bulkWrite.mock.calls[0][0];
    expect(ops).toHaveLength(1);
    expect(ops[0].updateOne.filter.url).toBe('https://othersource.com/article-2');
  });

  it('reports not-connected when persist=true but database is unavailable', async () => {
    isDatabaseConnected.mockReturnValue(false);
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
          rawMetadata: {}
        }
      ]
    });

    const response = await request(app)
      .post('/api/v1/news/ingest')
      .send({
        url: 'https://example.com/news',
        language: 'en',
        maxItems: 5,
        persist: true
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.dbStatus).toBe('not-connected');
    expect(response.body.persistedCount).toBe(0);
    expect(NewsCard.bulkWrite).not.toHaveBeenCalled();
  });
});
