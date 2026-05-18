const {
  getTrendingContent,
  getCardEngagementMetrics,
  getUserEngagementSummary,
  getTopCategories
} = require('../src/services/analyticsService');
const UserActivityEvent = require('../src/models/UserActivityEvent');
const mongoose = require('mongoose');

jest.mock('../src/models/UserActivityEvent');

describe('analyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrendingContent', () => {
    it('aggregates view events and returns trending cards', async () => {
      const mockResults = [
        {
          _id: new mongoose.Types.ObjectId(),
          viewCount: 150,
          avgDuration: 45000,
          title: 'Top Story',
          source: 'BBC',
          category: 'Tech',
          language: 'en'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          viewCount: 80,
          avgDuration: 32000,
          title: 'Second Story',
          source: 'Reuters',
          category: 'Science'
        }
      ];

      UserActivityEvent.aggregate = jest.fn().mockResolvedValue(mockResults);

      const results = await getTrendingContent({ limit: 10 });

      expect(results).toEqual(mockResults);
      expect(UserActivityEvent.aggregate).toHaveBeenCalled();
      const pipeline = UserActivityEvent.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.eventType).toBe('view');
    });

    it('filters by category when provided', async () => {
      UserActivityEvent.aggregate = jest.fn().mockResolvedValue([]);

      await getTrendingContent({ category: 'Tech', limit: 10 });

      const pipeline = UserActivityEvent.aggregate.mock.calls[0][0];
      const categoryMatch = pipeline.find((stage) => stage.$match?.['cardMetadata.category']);
      expect(categoryMatch).toBeDefined();
      expect(categoryMatch.$match['cardMetadata.category']).toBe('Tech');
    });

    it('defaults to last 7 days when no date provided', async () => {
      UserActivityEvent.aggregate = jest.fn().mockResolvedValue([]);

      await getTrendingContent({});

      const pipeline = UserActivityEvent.aggregate.mock.calls[0][0];
      const matchStage = pipeline[0];
      expect(matchStage.$match.eventAt.$gte).toBeDefined();
      expect(matchStage.$match.eventAt.$lte).toBeDefined();
    });

    it('returns empty array on aggregation error', async () => {
      UserActivityEvent.aggregate = jest.fn().mockRejectedValue(new Error('DB error'));

      const results = await getTrendingContent({});

      expect(results).toEqual([]);
    });
  });

  describe('getCardEngagementMetrics', () => {
    it('aggregates engagement metrics by event type', async () => {
      const cardId = new mongoose.Types.ObjectId();
      const mockResults = [
        { _id: 'view', count: 100, avgDuration: 45000 },
        { _id: 'bookmark', count: 10 },
        { _id: 'translate', count: 5 },
        { _id: 'share', count: 2 }
      ];

      UserActivityEvent.aggregate = jest.fn().mockResolvedValue(mockResults);

      const metrics = await getCardEngagementMetrics(cardId);

      expect(metrics.views).toBe(100);
      expect(metrics.bookmarks).toBe(10);
      expect(metrics.translates).toBe(5);
      expect(metrics.shares).toBe(2);
      expect(metrics.avgViewDuration).toBe(45000);
    });

    it('calculates engagement rate correctly', async () => {
      const cardId = new mongoose.Types.ObjectId();
      const mockResults = [
        { _id: 'view', count: 100 },
        { _id: 'bookmark', count: 10 },
        { _id: 'translate', count: 5 }
      ];

      UserActivityEvent.aggregate = jest.fn().mockResolvedValue(mockResults);

      const metrics = await getCardEngagementMetrics(cardId);

      // (10 + 5 + 0) / 100 = 0.15
      expect(metrics.engagementRate).toBe(0.15);
    });

    it('handles cards with no events', async () => {
      const cardId = new mongoose.Types.ObjectId();
      UserActivityEvent.aggregate = jest.fn().mockResolvedValue([]);

      const metrics = await getCardEngagementMetrics(cardId);

      expect(metrics.views).toBe(0);
      expect(metrics.bookmarks).toBe(0);
      expect(metrics.engagementRate).toBe(0);
    });

    it('returns zero engagement rate when no views', async () => {
      const cardId = new mongoose.Types.ObjectId();
      const mockResults = [{ _id: 'bookmark', count: 5 }];

      UserActivityEvent.aggregate = jest.fn().mockResolvedValue(mockResults);

      const metrics = await getCardEngagementMetrics(cardId);

      expect(metrics.views).toBe(0);
      expect(metrics.engagementRate).toBe(0);
    });
  });

  describe('getUserEngagementSummary', () => {
    it('aggregates user activity across all event types', async () => {
      const userId = new mongoose.Types.ObjectId();
      const now = new Date();
      const mockResults = [
        { _id: 'view', count: 50, lastEventAt: now },
        { _id: 'bookmark', count: 10, lastEventAt: now },
        { _id: 'translate', count: 5, lastEventAt: now },
        { _id: 'share', count: 2, lastEventAt: now }
      ];

      UserActivityEvent.aggregate = jest.fn().mockResolvedValue(mockResults);

      const summary = await getUserEngagementSummary(userId);

      expect(summary.totalViews).toBe(50);
      expect(summary.totalBookmarks).toBe(10);
      expect(summary.totalTranslates).toBe(5);
      expect(summary.totalShares).toBe(2);
      expect(summary.totalEvents).toBe(67);
      expect(summary.lastActivityAt).toEqual(now);
    });

    it('handles user with no events', async () => {
      const userId = new mongoose.Types.ObjectId();
      UserActivityEvent.aggregate = jest.fn().mockResolvedValue([]);

      const summary = await getUserEngagementSummary(userId);

      expect(summary.totalViews).toBe(0);
      expect(summary.totalEvents).toBe(0);
      expect(summary.lastActivityAt).toBeNull();
    });
  });

  describe('getTopCategories', () => {
    it('groups categories by engagement metrics', async () => {
      const mockResults = [
        {
          _id: 'Tech',
          views: 500,
          bookmarks: 50,
          translates: 20,
          engagement: 70,
          engagementRate: 0.14
        },
        {
          _id: 'Science',
          views: 300,
          bookmarks: 30,
          translates: 10,
          engagement: 40,
          engagementRate: 0.133
        }
      ];

      UserActivityEvent.aggregate = jest.fn().mockResolvedValue(mockResults);

      const categories = await getTopCategories({ limit: 10 });

      expect(categories).toEqual(mockResults);
      expect(categories[0]._id).toBe('Tech');
      expect(categories[0].engagementRate).toBeGreaterThan(categories[1].engagementRate);
    });

    it('sorts by engagement count descending', async () => {
      const mockResults = [
        { _id: 'Tech', views: 100, engagement: 30, engagementRate: 0.3 },
        { _id: 'Science', views: 150, engagement: 20, engagementRate: 0.13 }
      ];

      UserActivityEvent.aggregate = jest.fn().mockResolvedValue(mockResults);

      const categories = await getTopCategories({ limit: 5 });

      // Pipeline should sort by engagement descending
      const pipeline = UserActivityEvent.aggregate.mock.calls[0][0];
      const sortStage = pipeline.find((stage) => stage.$sort);
      expect(sortStage.$sort.engagement).toBe(-1);
    });

    it('returns empty array on error', async () => {
      UserActivityEvent.aggregate = jest.fn().mockRejectedValue(new Error('Pipeline error'));

      const categories = await getTopCategories({});

      expect(categories).toEqual([]);
    });
  });
});
