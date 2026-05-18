const request = require('supertest');

const mockChain = {
  sort: jest.fn(),
  skip: jest.fn(),
  limit: jest.fn(),
  lean: jest.fn()
};

jest.mock('../src/models/NewsCard', () => ({
  find: jest.fn(() => mockChain),
  aggregate: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  isDatabaseConnected: jest.fn(),
  getConnection: jest.fn(() => ({ readyState: 1 }))
}));

const NewsCard = require('../src/models/NewsCard');
const User = require('../src/models/User');
const { isDatabaseConnected } = require('../src/config/database');
const { app } = require('../src/index');

describe('news cards integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockChain.sort.mockReturnValue(mockChain);
    mockChain.skip.mockReturnValue(mockChain);
    mockChain.limit.mockReturnValue(mockChain);
    mockChain.lean.mockResolvedValue([]);

    isDatabaseConnected.mockReturnValue(true);
    NewsCard.countDocuments.mockResolvedValue(0);
    NewsCard.aggregate.mockResolvedValue([]);
    User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  });

  it('returns 400 for invalid query payload', async () => {
    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ page: 'not-a-number' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        message: 'Validation failed.'
      }
    });
  });

  it('returns 400 for invalid sort value', async () => {
    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ sort: 'oldest' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.details).toContain('sort must be one of: latest, relevance, trending.');
  });

  it('returns 503 when database is unavailable', async () => {
    isDatabaseConnected.mockReturnValue(false);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ language: 'en' });

    expect(response.statusCode).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        statusCode: 503,
        message: 'Internal server error.'
      }
    });
    expect(NewsCard.find).not.toHaveBeenCalled();
  });

  it('returns paginated cards with normalized filters', async () => {
    const mockItems = [
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Card 1',
        category: 'Business',
        language: 'en'
      },
      {
        _id: '507f1f77bcf86cd799439012',
        title: 'Card 2',
        category: 'Business',
        language: 'en'
      }
    ];

    mockChain.lean.mockResolvedValue(mockItems);
    NewsCard.countDocuments.mockResolvedValue(5);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({
        language: 'ENGLISH',
        category: 'Business',
        page: '2',
        limit: '2'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      message: 'News cards fetched successfully.',
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasMore: true,
      filters: {
        language: 'en',
        category: 'Business',
        q: null,
        sort: 'latest'
      }
    });
    expect(response.body.cards).toHaveLength(2);

    expect(NewsCard.find).toHaveBeenCalledWith(
      {
        language: 'en',
        category: {
          $regex: '^Business$',
          $options: 'i'
        }
      },
      undefined
    );
    expect(mockChain.sort).toHaveBeenCalledWith({ scrapedAt: -1 });
    expect(mockChain.skip).toHaveBeenCalledWith(2);
    expect(mockChain.limit).toHaveBeenCalledWith(2);
    expect(NewsCard.countDocuments).toHaveBeenCalledWith({
      language: 'en',
      category: {
        $regex: '^Business$',
        $options: 'i'
      }
    });
  });

  it('returns hasMore false when page reaches totalPages', async () => {
    mockChain.lean.mockResolvedValue([{ title: 'Last card' }]);
    NewsCard.countDocuments.mockResolvedValue(3);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ page: '2', limit: '2', language: 'en' });

    expect(response.statusCode).toBe(200);
    expect(response.body.totalPages).toBe(2);
    expect(response.body.hasMore).toBe(false);
  });

  it('supports text search with relevance sorting when q is provided', async () => {
    mockChain.lean.mockResolvedValue([{ title: 'AI breakthrough in health tech' }]);
    NewsCard.countDocuments.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ language: 'en', q: 'health tech', sort: 'relevance', page: '1', limit: '10' });

    expect(response.statusCode).toBe(200);
    expect(response.body.filters).toEqual({
      language: 'en',
      category: null,
      q: 'health tech',
      sort: 'relevance'
    });

    expect(NewsCard.find).toHaveBeenCalledWith(
      {
        language: 'en',
        $text: { $search: 'health tech' }
      },
      { score: { $meta: 'textScore' } }
    );
    expect(mockChain.sort).toHaveBeenCalledWith({
      score: { $meta: 'textScore' },
      scrapedAt: -1
    });
  });

  it('falls back to latest sort when relevance is requested without q', async () => {
    mockChain.lean.mockResolvedValue([]);
    NewsCard.countDocuments.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ language: 'en', sort: 'relevance' });

    expect(response.statusCode).toBe(200);
    expect(response.body.filters.sort).toBe('latest');

    expect(NewsCard.find).toHaveBeenCalledWith(
      { language: 'en' },
      undefined
    );
    expect(mockChain.sort).toHaveBeenCalledWith({ scrapedAt: -1 });
  });

  it('returns trending sort using trendScore when sort=trending', async () => {
    const mockCards = [{ _id: '1', title: 'Trending news', trendScore: 0.8 }];
    mockChain.lean.mockResolvedValue(mockCards);
    NewsCard.countDocuments.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .query({ language: 'en', sort: 'trending' });

    expect(response.statusCode).toBe(200);
    expect(response.body.filters.sort).toBe('trending');
    expect(NewsCard.find).toHaveBeenCalled();
    expect(mockChain.sort).toHaveBeenCalledWith({ trendScore: -1, scrapedAt: -1 });
  });

  it('uses personalized aggregation for sort=trending when user is authenticated', async () => {
    const mockAggResult = [{ _id: '1', title: 'Tech news', category: 'Technology', trendScore: 1.2 }];
    NewsCard.aggregate.mockResolvedValue(mockAggResult);
    NewsCard.countDocuments.mockResolvedValue(1);

    // Mock a user with category preferences
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ preferences: { categories: ['Technology'] } })
    });

    // Sign a JWT for the test user
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { sub: 'user-id-1', role: 'user', email: 'test@example.com' },
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
    );

    const response = await request(app)
      .get('/api/v1/news/cards')
      .set('Authorization', `Bearer ${token}`)
      .query({ language: 'en', sort: 'trending' });

    expect(response.statusCode).toBe(200);
    expect(response.body.filters.sort).toBe('trending');
    expect(NewsCard.aggregate).toHaveBeenCalled();
    // find() should NOT be called when aggregate is used
    expect(mockChain.sort).not.toHaveBeenCalled();
  });
});
