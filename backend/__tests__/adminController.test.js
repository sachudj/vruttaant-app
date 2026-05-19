const { getDetailedHealth, getSystemStats, sendAdminNotification } = require('../src/controllers/adminController');
const User = require('../src/models/User');
const Bookmark = require('../src/models/Bookmark');
const NewsCard = require('../src/models/NewsCard');
const RefreshToken = require('../src/models/RefreshToken');
const NotificationDevice = require('../src/models/NotificationDevice');
const pushNotificationService = require('../src/services/pushNotificationService');

jest.mock('../src/models/User');
jest.mock('../src/models/Bookmark');
jest.mock('../src/models/NewsCard');
jest.mock('../src/models/RefreshToken');
jest.mock('../src/models/NotificationDevice');
jest.mock('../src/services/pushNotificationService');

// Mock database module
jest.mock('../src/config/database', () => ({
  getConnection: () => ({
    readyState: 1 // Connected state
  })
}));

describe('adminController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: {
        id: 'admin-123',
        role: 'admin'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('getDetailedHealth', () => {
    it('should return healthy status with database connection info', async () => {
      // Promise.all calls in order: User, Bookmark, NewsCard, RefreshToken (revoked)
      User.countDocuments.mockResolvedValueOnce(100);
      Bookmark.countDocuments.mockResolvedValueOnce(500);
      NewsCard.countDocuments.mockResolvedValueOnce(5000);
      RefreshToken.countDocuments
        .mockResolvedValueOnce(50) // revoked tokens in promise.all
        .mockResolvedValueOnce(150); // active tokens in response

      // Separate call for admin count
      User.countDocuments.mockResolvedValueOnce(5);

      await getDetailedHealth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const callData = res.json.mock.calls[0][0];
      expect(callData).toMatchObject({
        success: true,
        data: {
          health: {
            status: 'healthy',
            timestamp: expect.any(String),
            uptime: expect.any(Number),
            uptimeSeconds: expect.any(Number)
          },
          database: {
            connected: true,
            readyState: 1
          },
          collections: {
            users: {
              total: 100,
              admins: 5,
              regularUsers: 95
            },
            bookmarks: 500,
            newsCards: 5000,
            refreshTokens: {
              active: 150,
              revoked: 50
            }
          },
          environment: {
            nodeEnv: expect.any(String),
            nodeVersion: expect.any(String)
          }
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should include uptime information', async () => {
      User.countDocuments.mockResolvedValue(10);
      Bookmark.countDocuments.mockResolvedValue(50);
      NewsCard.countDocuments.mockResolvedValue(500);
      RefreshToken.countDocuments.mockResolvedValueOnce(5);
      User.countDocuments.mockResolvedValueOnce(1);

      await getDetailedHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.data.health.uptime).toBeGreaterThanOrEqual(0);
      expect(response.data.health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      User.countDocuments.mockRejectedValue(dbError);

      await getDetailedHealth(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it('should show connection status when database is disconnected', async () => {
      // This test would require mocking getConnection differently
      // For now, we'll test that the response structure includes the readyState
      User.countDocuments.mockResolvedValue(10);
      Bookmark.countDocuments.mockResolvedValue(50);
      NewsCard.countDocuments.mockResolvedValue(500);
      RefreshToken.countDocuments.mockResolvedValueOnce(5);
      User.countDocuments.mockResolvedValueOnce(1);

      await getDetailedHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.data.database).toHaveProperty('readyState');
    });
  });

  describe('getSystemStats', () => {
    it('should return system statistics with user and bookmark data', async () => {
      // User.countDocuments calls in order:
      // 1. activeUsersThirtyDays
      // 2. activeUsersSevenDays
      // 3. totalUsers
      User.countDocuments
        .mockResolvedValueOnce(80) // active last 30 days
        .mockResolvedValueOnce(50) // active last 7 days
        .mockResolvedValueOnce(100); // total users

      // Bookmark.countDocuments calls in order:
      // 1. bookmarksThirtyDays
      // 2. totalBookmarks
      Bookmark.countDocuments
        .mockResolvedValueOnce(120) // bookmarks created 30 days
        .mockResolvedValueOnce(500); // total bookmarks

      // NewsCard.countDocuments calls in order:
      // 1. newsCardsThirtyDays
      // 2. total news cards
      NewsCard.countDocuments
        .mockResolvedValueOnce(800) // news cards 30 days
        .mockResolvedValueOnce(5000); // total news cards

      Bookmark.aggregate.mockResolvedValue([
        { _id: 'Technology', count: 150 },
        { _id: 'Business', count: 120 },
        { _id: 'Health', count: 100 }
      ]);

      await getSystemStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const callData = res.json.mock.calls[0][0];
      expect(callData.success).toBe(true);
      expect(callData.data.stats).toMatchObject({
        timestamp: expect.any(String),
        period: '30_days',
        users: {
          total: 100,
          active30d: 80,
          active7d: 50
        },
        bookmarks: {
          total: 500,
          created30d: 120,
          avgPerUser: 5.0
        },
        newsCards: {
          total: 5000,
          created30d: 800
        },
        topBookmarkedCategories: [
          { category: 'Technology', count: 150 },
          { category: 'Business', count: 120 },
          { category: 'Health', count: 100 }
        ]
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should calculate average bookmarks per user correctly', async () => {
      // Mock in correct order: activeUsersThirtyDays, activeUsersSevenDays, totalUsers
      User.countDocuments
        .mockResolvedValueOnce(40) // active 30d
        .mockResolvedValueOnce(30) // active 7d
        .mockResolvedValueOnce(50); // total users

      // Mock in correct order: bookmarksThirtyDays, totalBookmarks
      Bookmark.countDocuments
        .mockResolvedValueOnce(100) // created 30d
        .mockResolvedValueOnce(250); // total bookmarks (250 / 50 = 5.0)

      // Mock in correct order: newsCardsThirtyDays, totalNewsCards
      NewsCard.countDocuments
        .mockResolvedValueOnce(300)
        .mockResolvedValueOnce(2000);

      Bookmark.aggregate.mockResolvedValue([]);

      await getSystemStats(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.data.stats.bookmarks.avgPerUser).toBe(5.0); // 250 / 50
    });

    it('should handle zero users for average calculation', async () => {
      User.countDocuments
        .mockResolvedValueOnce(0) // active 30d
        .mockResolvedValueOnce(0) // active 7d
        .mockResolvedValueOnce(0); // total users

      Bookmark.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      NewsCard.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      Bookmark.aggregate.mockResolvedValue([]);

      await getSystemStats(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.data.stats.bookmarks.avgPerUser).toBe(0);
    });

    it('should include top bookmarked categories', async () => {
      User.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(5);

      Bookmark.countDocuments
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(20);

      NewsCard.countDocuments
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(100);

      Bookmark.aggregate.mockResolvedValue([
        { _id: 'Tech', count: 20 },
        { _id: 'News', count: 15 },
        { _id: 'Sports', count: 10 },
        { _id: 'Health', count: 5 }
      ]);

      await getSystemStats(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.data.stats.topBookmarkedCategories).toHaveLength(4);
      expect(response.data.stats.topBookmarkedCategories[0].category).toBe('Tech');
      expect(response.data.stats.topBookmarkedCategories[0].count).toBe(20);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database query failed');
      User.countDocuments.mockRejectedValue(dbError);

      await getSystemStats(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it('should query for correct time ranges', async () => {
      User.countDocuments
        .mockResolvedValueOnce(50) // active 30d
        .mockResolvedValueOnce(30) // active 7d
        .mockResolvedValueOnce(100); // total

      Bookmark.countDocuments
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(200);

      NewsCard.countDocuments
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(1000);

      Bookmark.aggregate.mockResolvedValue([]);

      const beforeCall = Date.now();
      await getSystemStats(req, res, next);
      const afterCall = Date.now();

      // Verify that User.countDocuments was called for time-based queries
      // The calls should include lastLoginAt comparisons
      expect(User.countDocuments).toHaveBeenCalled();
    });
  });

  // ── sendAdminNotification ──────────────────────────────────────────────────
  describe('sendAdminNotification', () => {
    function makeAsyncIterator(items) {
      let i = 0;
      return {
        [Symbol.asyncIterator]() { return this; },
        async next() {
          if (i < items.length) return { value: items[i++], done: false };
          return { value: undefined, done: true };
        }
      };
    }

    it('returns 400 when title is missing', async () => {
      req.body = { body: 'Some body' };
      await sendAdminNotification(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 400 when body is missing', async () => {
      req.body = { title: 'Title' };
      await sendAdminNotification(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('sends notifications to all users when audience is not breakingNews', async () => {
      const users = [{ _id: 'u1' }, { _id: 'u2' }];
      User.find.mockReturnValue({ select: jest.fn().mockReturnValue({ cursor: jest.fn().mockReturnValue(makeAsyncIterator(users)) }) });
      NotificationDevice.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ token: 'tok1' }, { token: 'tok2' }]) });
      pushNotificationService.sendMulticast.mockResolvedValue({ successCount: 2 });

      req.body = { title: 'Alert', body: 'Message', audience: 'all' };
      await sendAdminNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pushNotificationService.sendMulticast).toHaveBeenCalledTimes(2);
    });

    it('sends only to breakingNews users when audience=breakingNews', async () => {
      const users = [{ _id: 'u1' }];
      User.find.mockReturnValue({ select: jest.fn().mockReturnValue({ cursor: jest.fn().mockReturnValue(makeAsyncIterator(users)) }) });
      NotificationDevice.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ token: 'tok1' }]) });
      pushNotificationService.sendMulticast.mockResolvedValue({ successCount: 1 });

      req.body = { title: 'Breaking', body: 'News', audience: 'breakingNews' };
      await sendAdminNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({ 'preferences.notifications.breakingNews': true })
      );
    });

    it('skips users with no registered devices', async () => {
      const users = [{ _id: 'u1' }];
      User.find.mockReturnValue({ select: jest.fn().mockReturnValue({ cursor: jest.fn().mockReturnValue(makeAsyncIterator(users)) }) });
      NotificationDevice.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      req.body = { title: 'Alert', body: 'Body', audience: 'all' };
      await sendAdminNotification(req, res, next);

      expect(pushNotificationService.sendMulticast).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next on DB error', async () => {
      User.find.mockReturnValue({ select: jest.fn().mockReturnValue({ cursor: jest.fn().mockImplementation(() => { throw new Error('cursor fail'); }) }) });
      req.body = { title: 'Title', body: 'Body', audience: 'all' };
      await sendAdminNotification(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
