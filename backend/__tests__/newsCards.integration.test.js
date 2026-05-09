const request = require('supertest');

const mockChain = {
  sort: jest.fn(),
  skip: jest.fn(),
  limit: jest.fn(),
  lean: jest.fn()
};

jest.mock('../src/models/NewsCard', () => ({
  find: jest.fn(() => mockChain),
  countDocuments: jest.fn()
}));

jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  isDatabaseConnected: jest.fn(),
  getConnection: jest.fn(() => ({ readyState: 1 }))
}));

const NewsCard = require('../src/models/NewsCard');
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
        category: 'Business'
      }
    });
    expect(response.body.cards).toHaveLength(2);

    expect(NewsCard.find).toHaveBeenCalledWith({
      language: 'en',
      category: {
        $regex: '^Business$',
        $options: 'i'
      }
    });
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
});
