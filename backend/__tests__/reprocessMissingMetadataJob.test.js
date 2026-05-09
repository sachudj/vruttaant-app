jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn(),
  isDatabaseConnected: jest.fn()
}));

jest.mock('../src/models/NewsCard', () => ({
  find: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../src/services/newsIngestionService', () => ({
  summarizeWithLlm: jest.fn()
}));

jest.mock('../src/observability/auditLogger', () => ({
  logAuditEvent: jest.fn()
}));

const { connectDatabase, isDatabaseConnected } = require('../src/config/database');
const NewsCard = require('../src/models/NewsCard');
const { summarizeWithLlm } = require('../src/services/newsIngestionService');
const { logAuditEvent } = require('../src/observability/auditLogger');
const {
  parseLimit,
  buildMissingMetadataQuery,
  reprocessMissingMetadata
} = require('../src/jobs/reprocessMissingMetadata');

describe('reprocessMissingMetadata job', () => {
  const mockChain = {
    sort: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    connectDatabase.mockResolvedValue(true);
    isDatabaseConnected.mockReturnValue(true);

    mockChain.sort.mockReturnValue(mockChain);
    mockChain.limit.mockReturnValue(mockChain);
    mockChain.lean.mockResolvedValue([]);

    NewsCard.find.mockReturnValue(mockChain);
    NewsCard.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  test('parseLimit clamps values to supported range', () => {
    expect(parseLimit('invalid')).toBe(50);
    expect(parseLimit(0)).toBe(1);
    expect(parseLimit(1000)).toBe(200);
    expect(parseLimit(25)).toBe(25);
  });

  test('buildMissingMetadataQuery matches empty summary/category records', () => {
    expect(buildMissingMetadataQuery()).toEqual({
      $or: [
        { aiSummary: { $in: [null, ''] } },
        { category: { $in: [null, ''] } }
      ]
    });
  });

  test('throws when database is not connected', async () => {
    connectDatabase.mockResolvedValue(false);

    await expect(reprocessMissingMetadata()).rejects.toThrow(
      'Database is not connected. Cannot run reprocessing job.'
    );
  });

  test('reprocesses cards with missing metadata and updates them', async () => {
    mockChain.lean.mockResolvedValue([
      {
        _id: 'card-1',
        title: 'Title 1',
        summary: 'Summary 1',
        source: 'Source 1',
        url: 'https://example.com/1',
        language: 'en',
        aiSummary: '',
        category: ''
      },
      {
        _id: 'card-2',
        title: 'Title 2',
        summary: 'Summary 2',
        source: 'Source 2',
        url: 'https://example.com/2',
        language: 'hi',
        aiSummary: '',
        category: 'General'
      }
    ]);

    summarizeWithLlm
      .mockResolvedValueOnce({ aiSummary: 'AI summary 1', category: 'Business' })
      .mockResolvedValueOnce({ aiSummary: 'AI summary 2', category: 'World' });

    const result = await reprocessMissingMetadata({ batchLimit: 10 });

    expect(result).toEqual({
      scanned: 2,
      updated: 2,
      skipped: 0,
      failed: 0
    });

    expect(NewsCard.find).toHaveBeenCalledWith(buildMissingMetadataQuery());
    expect(mockChain.limit).toHaveBeenCalledWith(10);
    expect(NewsCard.updateOne).toHaveBeenCalledTimes(2);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  test('logs audit event and continues when llm enrichment fails for a card', async () => {
    mockChain.lean.mockResolvedValue([
      {
        _id: 'card-1',
        title: 'Title 1',
        summary: 'Summary 1',
        source: 'Source 1',
        url: 'https://example.com/1',
        language: 'en',
        aiSummary: '',
        category: ''
      },
      {
        _id: 'card-2',
        title: 'Title 2',
        summary: 'Summary 2',
        source: 'Source 2',
        url: 'https://example.com/2',
        language: 'en',
        aiSummary: '',
        category: ''
      }
    ]);

    summarizeWithLlm
      .mockRejectedValueOnce(new Error('LLM down'))
      .mockResolvedValueOnce({ aiSummary: 'AI summary 2', category: 'World' });

    const result = await reprocessMissingMetadata({ batchLimit: 10 });

    expect(result).toEqual({
      scanned: 2,
      updated: 1,
      skipped: 0,
      failed: 1
    });

    expect(logAuditEvent).toHaveBeenCalledWith(
      'news_card_reprocess_failed',
      expect.objectContaining({
        cardId: 'card-1',
        error: 'LLM down'
      })
    );
  });
});
