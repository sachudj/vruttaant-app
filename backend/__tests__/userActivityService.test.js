'use strict';

jest.mock('../src/models/UserActivityEvent');

const UserActivityEvent = require('../src/models/UserActivityEvent');
const {
  getUserActivityHistory,
  getReadingFeed,
  getUserActivityStats,
  getCardActivityMetrics
} = require('../src/services/userActivityService');

// ─── helpers ──────────────────────────────────────────────────────────────────
const SAMPLE_EVENTS = [
  { _id: 'e1', userId: 'uid1', eventType: 'view', eventAt: new Date('2026-01-10') },
  { _id: 'e2', userId: 'uid1', eventType: 'bookmark', eventAt: new Date('2026-01-09') }
];

// ─── getUserActivityHistory ───────────────────────────────────────────────────
describe('userActivityService.getUserActivityHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 when userId is missing', async () => {
    await expect(getUserActivityHistory(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns paginated activity for a user', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(2);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(SAMPLE_EVENTS)
          })
        })
      })
    });

    const result = await getUserActivityHistory('uid1');
    expect(result.activities).toEqual(SAMPLE_EVENTS);
    expect(result.totalCount).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it('applies eventType filter', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(1);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([SAMPLE_EVENTS[0]]) })
        })
      })
    });

    await getUserActivityHistory('uid1', 1, 20, { eventType: 'view' });
    expect(UserActivityEvent.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'view' })
    );
  });

  it('applies language filter', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(0);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
        })
      })
    });

    await getUserActivityHistory('uid1', 1, 20, { language: 'hi' });
    expect(UserActivityEvent.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ 'cardMetadata.language': 'hi' })
    );
  });

  it('applies category filter', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(0);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
        })
      })
    });

    await getUserActivityHistory('uid1', 1, 20, { category: 'Tech' });
    expect(UserActivityEvent.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ 'cardMetadata.category': 'Tech' })
    );
  });

  it('applies date range filter', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(0);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
        })
      })
    });

    await getUserActivityHistory('uid1', 1, 20, {
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    });
    expect(UserActivityEvent.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ eventAt: expect.objectContaining({ $gte: expect.any(Date) }) })
    );
  });

  it('applies only startDate when endDate is absent', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(0);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
        })
      })
    });

    await getUserActivityHistory('uid1', 1, 20, { startDate: '2026-01-01' });
    expect(UserActivityEvent.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ eventAt: expect.objectContaining({ $gte: expect.any(Date) }) })
    );
  });

  it('clamps limit to 100', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(0);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
        })
      })
    });

    const result = await getUserActivityHistory('uid1', 1, 9999, {});
    expect(result.limit).toBe(100);
  });

  it('hasMore is true when more pages exist', async () => {
    UserActivityEvent.countDocuments.mockResolvedValue(50);
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(SAMPLE_EVENTS) })
        })
      })
    });

    const result = await getUserActivityHistory('uid1', 1, 20, {});
    expect(result.hasMore).toBe(true);
    expect(result.totalPages).toBe(3);
  });

  it('wraps DB errors in AppError 500', async () => {
    UserActivityEvent.countDocuments.mockRejectedValue(new Error('DB down'));
    await expect(getUserActivityHistory('uid1')).rejects.toMatchObject({ statusCode: 500 });
  });
});

// ─── getReadingFeed ───────────────────────────────────────────────────────────
describe('userActivityService.getReadingFeed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 when userId is missing', async () => {
    await expect(getReadingFeed(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns view events sorted by recency', async () => {
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([SAMPLE_EVENTS[0]])
        })
      })
    });

    const result = await getReadingFeed('uid1');
    expect(result).toEqual([SAMPLE_EVENTS[0]]);
    expect(UserActivityEvent.find).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'uid1', eventType: 'view' })
    );
  });

  it('clamps limit to 100', async () => {
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
      })
    });

    await getReadingFeed('uid1', 9999);
    const limitCall = UserActivityEvent.find().sort().limit.mock.calls[0][0];
    expect(limitCall).toBe(100);
  });

  it('wraps DB errors in AppError 500', async () => {
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('conn error')) })
      })
    });

    await expect(getReadingFeed('uid1')).rejects.toMatchObject({ statusCode: 500 });
  });
});

// ─── getUserActivityStats ─────────────────────────────────────────────────────
describe('userActivityService.getUserActivityStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 when userId is missing', async () => {
    await expect(getUserActivityStats(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns zero stats when aggregate returns empty array', async () => {
    UserActivityEvent.aggregate.mockResolvedValue([]);
    const result = await getUserActivityStats('uid1');
    expect(result.totalViews).toBe(0);
    expect(result.topCategories).toEqual([]);
    expect(result.lastActivityAt).toBeNull();
  });

  it('maps aggregate facet results correctly', async () => {
    UserActivityEvent.aggregate.mockResolvedValue([{
      eventTypeCounts: [
        { _id: 'view', count: 10 },
        { _id: 'bookmark', count: 3 },
        { _id: 'translate', count: 2 },
        { _id: 'share', count: 1 }
      ],
      topCategories: [{ _id: 'Tech', count: 5 }],
      topLanguages: [{ _id: 'en', count: 8 }],
      lastActivity: [{ eventAt: new Date('2026-05-19') }]
    }]);

    const result = await getUserActivityStats('uid1');
    expect(result.totalViews).toBe(10);
    expect(result.totalBookmarks).toBe(3);
    expect(result.totalTranslations).toBe(2);
    expect(result.totalShares).toBe(1);
    expect(result.topCategories).toEqual([{ _id: 'Tech', count: 5 }]);
    expect(result.topLanguages).toEqual([{ _id: 'en', count: 8 }]);
    expect(result.lastActivityAt).toEqual(new Date('2026-05-19'));
  });

  it('returns null lastActivityAt when lastActivity array is empty', async () => {
    UserActivityEvent.aggregate.mockResolvedValue([{
      eventTypeCounts: [],
      topCategories: [],
      topLanguages: [],
      lastActivity: []
    }]);

    const result = await getUserActivityStats('uid1');
    expect(result.lastActivityAt).toBeNull();
  });

  it('wraps DB errors in AppError 500', async () => {
    UserActivityEvent.aggregate.mockRejectedValue(new Error('pipeline failed'));
    await expect(getUserActivityStats('uid1')).rejects.toMatchObject({ statusCode: 500 });
  });
});

// ─── getCardActivityMetrics ───────────────────────────────────────────────────
describe('userActivityService.getCardActivityMetrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 when newsCardId is missing', async () => {
    await expect(getCardActivityMetrics(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns activity for a given card', async () => {
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(SAMPLE_EVENTS) })
      })
    });

    const result = await getCardActivityMetrics('card1');
    expect(result).toEqual(SAMPLE_EVENTS);
    expect(UserActivityEvent.find).toHaveBeenCalledWith({ newsCardId: 'card1' });
  });

  it('clamps limit to 500', async () => {
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
      })
    });

    await getCardActivityMetrics('card1', 9999);
    const limitCall = UserActivityEvent.find().sort().limit.mock.calls[0][0];
    expect(limitCall).toBe(500);
  });

  it('wraps DB errors in AppError 500', async () => {
    UserActivityEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('fail')) })
      })
    });

    await expect(getCardActivityMetrics('card1')).rejects.toMatchObject({ statusCode: 500 });
  });
});
