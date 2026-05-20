process.env.RESPONSE_COMPRESSION_THRESHOLD_BYTES = '1024';

const request = require('supertest');

const mockChain = {
  sort: jest.fn(),
  skip: jest.fn(),
  limit: jest.fn(),
  lean: jest.fn()
};

jest.mock('../src/models/NewsCard', () => ({
  find: jest.fn(() => mockChain),
  countDocuments: jest.fn(),
  aggregate: jest.fn()
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

describe('response compression integration', () => {
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

  it('does not compress small health responses by default', async () => {
    const response = await request(app)
      .get('/health')
      .set('Accept-Encoding', 'gzip');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('compresses larger api responses when the client accepts gzip', async () => {
    mockChain.lean.mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Card 1',
        summary: 'Long summary '.repeat(120),
        aiSummary: 'Expanded AI summary '.repeat(120),
        category: 'Business',
        source: 'Example Source',
        url: 'https://example.com/card-1',
        language: 'en'
      }
    ]);
    NewsCard.countDocuments.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/v1/news/cards')
      .set('Accept-Encoding', 'gzip')
      .query({ language: 'en' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.body.cards).toHaveLength(1);
  });
});