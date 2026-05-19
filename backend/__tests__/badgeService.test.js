const mongoose = require('mongoose');
const badgeService = require('../src/services/badgeService');

jest.mock('../src/models/Badge');
jest.mock('../src/models/UserBadge');
jest.mock('../src/models/UserActivityEvent');
jest.mock('../src/models/User');

const Badge = require('../src/models/Badge');
const UserBadge = require('../src/models/UserBadge');
const UserActivityEvent = require('../src/models/UserActivityEvent');

describe('Badge Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeBadgeDefinitions', () => {
    it('should create default badge definitions', async () => {
      Badge.findOneAndUpdate.mockResolvedValue({ _id: 'badge1', badgeId: 'first_read' });

      await badgeService.initializeBadgeDefinitions();

      expect(Badge.findOneAndUpdate).toHaveBeenCalled();
      const callCount = Badge.findOneAndUpdate.mock.calls.length;
      expect(callCount).toBeGreaterThan(10); // Should create 12+ badges
    });

    it('should use upsert to avoid duplicate entries', async () => {
      Badge.findOneAndUpdate.mockResolvedValue({});

      await badgeService.initializeBadgeDefinitions();

      const callArgs = Badge.findOneAndUpdate.mock.calls[0];
      expect(callArgs[2]).toEqual(expect.objectContaining({ upsert: true }));
    });

    it('should throw error if database operation fails', async () => {
      Badge.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

      await expect(badgeService.initializeBadgeDefinitions()).rejects.toThrow(
        'DB error'
      );
    });
  });

  describe('getUserEngagementMetrics', () => {
    it('should throw error if userId is missing', async () => {
      await expect(badgeService.getUserEngagementMetrics(null)).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should count total views from activity events', async () => {
      const userId = new mongoose.Types.ObjectId();
      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 2,
          totalBookmarks: 0,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 1,
          totalLanguages: 1,
          totalActions: 2
        }
      ]);

      const metrics = await badgeService.getUserEngagementMetrics(userId);

      expect(metrics.totalViews).toBe(2);
    });

    it('should count bookmarks, translations, and shares separately', async () => {
      const userId = new mongoose.Types.ObjectId();
      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 1,
          totalBookmarks: 2,
          totalTranslations: 1,
          totalShares: 1,
          totalCategories: 1,
          totalLanguages: 0,
          totalActions: 5
        }
      ]);

      const metrics = await badgeService.getUserEngagementMetrics(userId);

      expect(metrics.totalViews).toBe(1);
      expect(metrics.totalBookmarks).toBe(2);
      expect(metrics.totalTranslations).toBe(1);
      expect(metrics.totalShares).toBe(1);
    });

    it('should count unique categories from view events', async () => {
      const userId = new mongoose.Types.ObjectId();
      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 3,
          totalBookmarks: 1,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 2,
          totalLanguages: 0,
          totalActions: 4
        }
      ]);

      const metrics = await badgeService.getUserEngagementMetrics(userId);

      expect(metrics.totalCategories).toBe(2); // Tech, Politics (not Sports from bookmark)
    });

    it('should count unique languages', async () => {
      const userId = new mongoose.Types.ObjectId();
      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 2,
          totalBookmarks: 0,
          totalTranslations: 1,
          totalShares: 0,
          totalCategories: 0,
          totalLanguages: 3,
          totalActions: 3
        }
      ]);

      const metrics = await badgeService.getUserEngagementMetrics(userId);

      expect(metrics.totalLanguages).toBe(3); // en, es, fr
    });

    it('should return zero metrics for user with no activity', async () => {
      const userId = new mongoose.Types.ObjectId();
      UserActivityEvent.aggregate.mockResolvedValue([]);

      const metrics = await badgeService.getUserEngagementMetrics(userId);

      expect(metrics.totalViews).toBe(0);
      expect(metrics.totalBookmarks).toBe(0);
      expect(metrics.totalTranslations).toBe(0);
      expect(metrics.totalShares).toBe(0);
      expect(metrics.totalCategories).toBe(0);
      expect(metrics.totalLanguages).toBe(0);
    });
  });

  describe('checkBadgeCriteria', () => {
    it('should return true if user meets view threshold', () => {
      const badge = {
        criteria: { type: 'total_views', threshold: 10, operator: 'gte' }
      };
      const metrics = { totalViews: 15 };

      const result = badgeService.checkBadgeCriteria(badge, metrics);

      expect(result).toBe(true);
    });

    it('should return false if user does not meet threshold', () => {
      const badge = {
        criteria: { type: 'total_views', threshold: 10, operator: 'gte' }
      };
      const metrics = { totalViews: 5 };

      const result = badgeService.checkBadgeCriteria(badge, metrics);

      expect(result).toBe(false);
    });

    it('should support gt operator (greater than)', () => {
      const badge = {
        criteria: { type: 'total_views', threshold: 10, operator: 'gt' }
      };

      expect(badgeService.checkBadgeCriteria(badge, { totalViews: 11 })).toBe(
        true
      );
      expect(badgeService.checkBadgeCriteria(badge, { totalViews: 10 })).toBe(
        false
      );
    });

    it('should support eq operator (equal)', () => {
      const badge = {
        criteria: { type: 'total_bookmarks', threshold: 5, operator: 'eq' }
      };

      expect(badgeService.checkBadgeCriteria(badge, { totalBookmarks: 5 })).toBe(
        true
      );
      expect(badgeService.checkBadgeCriteria(badge, { totalBookmarks: 6 })).toBe(
        false
      );
    });

    it('should check all metric types', () => {
      const tests = [
        {
          badge: {
            criteria: { type: 'total_bookmarks', threshold: 5, operator: 'gte' }
          },
          metrics: { totalBookmarks: 7 },
          expected: true
        },
        {
          badge: {
            criteria: { type: 'total_categories', threshold: 3, operator: 'gte' }
          },
          metrics: { totalCategories: 5 },
          expected: true
        },
        {
          badge: { criteria: { type: 'unique_languages', threshold: 2, operator: 'gte' } },
          metrics: { totalLanguages: 3 },
          expected: true
        },
        {
          badge: {
            criteria: { type: 'total_translations', threshold: 10, operator: 'gte' }
          },
          metrics: { totalTranslations: 5 },
          expected: false
        }
      ];

      tests.forEach((test) => {
        expect(badgeService.checkBadgeCriteria(test.badge, test.metrics)).toBe(
          test.expected
        );
      });
    });
  });

  describe('evaluateAndAwardBadges', () => {
    it('should throw error if userId is missing', async () => {
      await expect(badgeService.evaluateAndAwardBadges(null)).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should award new badges when criteria are met', async () => {
      const userId = new mongoose.Types.ObjectId();
      const badgeId = new mongoose.Types.ObjectId();

      Badge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: badgeId,
              badgeId: 'first_read',
              name: 'First Read',
              icon: '📖',
              criteria: { type: 'total_views', threshold: 1, operator: 'gte' }
            }
          ])
        })
      });

      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 1,
          totalBookmarks: 0,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 1,
          totalLanguages: 0,
          totalActions: 1
        }
      ]);

      // UserBadge.find().select() chain
      UserBadge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      UserBadge.prototype.save = jest.fn().mockResolvedValue({
        userId,
        badgeId,
        badgeIdStr: 'first_read'
      });

      const awarded = await badgeService.evaluateAndAwardBadges(userId);

      expect(awarded.length).toBeGreaterThan(0);
      expect(awarded[0].badgeId).toBe('first_read');
    });

    it('should not award badges user already has', async () => {
      const userId = new mongoose.Types.ObjectId();
      const badgeId = new mongoose.Types.ObjectId();

      Badge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: badgeId,
              badgeId: 'first_read',
              criteria: { type: 'total_views', threshold: 1, operator: 'gte' }
            }
          ])
        })
      });

      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 1,
          totalBookmarks: 0,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 1,
          totalLanguages: 0,
          totalActions: 1
        }
      ]);

      // User already has this badge
      UserBadge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ userId, badgeIdStr: 'first_read' }])
        })
      });

      const awarded = await badgeService.evaluateAndAwardBadges(userId);

      expect(awarded.length).toBe(0); // No new badges
    });

    it('should award multiple badges in one evaluation', async () => {
      const userId = new mongoose.Types.ObjectId();

      Badge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: '1',
              badgeId: 'first_read',
              name: 'First Read',
              icon: '📖',
              criteria: { type: 'total_views', threshold: 1, operator: 'gte' }
            },
            {
              _id: '2',
              badgeId: 'avid_reader',
              name: 'Avid Reader',
              icon: '📚',
              criteria: { type: 'total_views', threshold: 10, operator: 'gte' }
            }
          ])
        })
      });

      // User has 15 views
      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 15,
          totalBookmarks: 0,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 1,
          totalLanguages: 0,
          totalActions: 15
        }
      ]);

      UserBadge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      UserBadge.prototype.save = jest.fn().mockResolvedValue({});

      const awarded = await badgeService.evaluateAndAwardBadges(userId);

      expect(awarded.length).toBe(2);
    });
  });

  describe('getUserBadges', () => {
    it('should throw error if userId is missing', async () => {
      await expect(badgeService.getUserBadges(null)).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should return user earned badges', async () => {
      const userId = new mongoose.Types.ObjectId();

      UserBadge.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([
            {
              badgeIdStr: 'first_read',
              earnedAt: new Date(),
              badgeId: {
                name: 'First Read',
                description: 'Read 1 article',
                icon: '📖',
                color: '#FF6B6B',
                tier: 'bronze',
                category: 'views'
              }
            }
          ])
        })
      });

      const badges = await badgeService.getUserBadges(userId);

      expect(badges.length).toBe(1);
      expect(badges[0].badgeId).toBe('first_read');
      expect(badges[0].name).toBe('First Read');
    });

    it('should sort badges by earned date descending', async () => {
      const userId = new mongoose.Types.ObjectId();
      const date1 = new Date('2026-05-01');
      const date2 = new Date('2026-05-05');

      UserBadge.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([
            { badgeIdStr: 'second', earnedAt: date2, badgeId: { name: 'Second' } },
            { badgeIdStr: 'first', earnedAt: date1, badgeId: { name: 'First' } }
          ])
        })
      });

      const badges = await badgeService.getUserBadges(userId);

      expect(badges[0].badgeId).toBe('second'); // More recent first
    });

    it('should return empty array for user with no badges', async () => {
      const userId = new mongoose.Types.ObjectId();

      UserBadge.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        }),
        select: jest.fn().mockResolvedValue([])
      });

      const badges = await badgeService.getUserBadges(userId);

      expect(badges).toEqual([]);
    });
  });

  describe('getUserBadgeProgress', () => {
    it('should throw error if userId is missing', async () => {
      await expect(badgeService.getUserBadgeProgress(null)).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should show progress toward badges', async () => {
      const userId = new mongoose.Types.ObjectId();

      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 2,
          totalBookmarks: 0,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 2,
          totalLanguages: 0,
          totalActions: 2
        }
      ]);

      Badge.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                badgeId: 'avid_reader',
                name: 'Avid Reader',
                description: 'Read 10 articles',
                icon: '📚',
                tier: 'bronze',
                category: 'views',
                criteria: { type: 'total_views', threshold: 10, operator: 'gte' }
              }
            ])
          })
        })
      });

      UserBadge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const progress = await badgeService.getUserBadgeProgress(userId);

      expect(progress.length).toBe(1);
      expect(progress[0].currentValue).toBe(2);
      expect(progress[0].threshold).toBe(10);
      expect(progress[0].progressPercent).toBe(20); // 2/10 = 20%
      expect(progress[0].earned).toBe(false);
    });

    it('should mark earned badges', async () => {
      const userId = new mongoose.Types.ObjectId();

      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 15,
          totalBookmarks: 0,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 1,
          totalLanguages: 0,
          totalActions: 15
        }
      ]);

      Badge.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                badgeId: 'avid_reader',
                name: 'Avid Reader',
                criteria: { type: 'total_views', threshold: 10, operator: 'gte' }
              }
            ])
          })
        })
      });

      UserBadge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ badgeIdStr: 'avid_reader' }])
        })
      });

      const progress = await badgeService.getUserBadgeProgress(userId);

      expect(progress[0].earned).toBe(true);
    });

    it('should cap progress at 100%', async () => {
      const userId = new mongoose.Types.ObjectId();

      UserActivityEvent.aggregate.mockResolvedValue([
        {
          totalViews: 50,
          totalBookmarks: 0,
          totalTranslations: 0,
          totalShares: 0,
          totalCategories: 1,
          totalLanguages: 0,
          totalActions: 50
        }
      ]);

      Badge.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                badgeId: 'avid_reader',
                name: 'Avid Reader',
                criteria: { type: 'total_views', threshold: 10, operator: 'gte' }
              }
            ])
          })
        })
      });

      UserBadge.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const progress = await badgeService.getUserBadgeProgress(userId);

      expect(progress[0].progressPercent).toBe(100);
    });
  });

  describe('getBadgeCatalog', () => {
    it('should return all active badges', async () => {
      Badge.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { badgeId: 'first_read', name: 'First Read', icon: '📖' },
              { badgeId: 'avid_reader', name: 'Avid Reader', icon: '📚' }
            ])
          })
        })
      });

      const catalog = await badgeService.getBadgeCatalog();

      expect(catalog.length).toBe(2);
      expect(catalog[0].badgeId).toBe('first_read');
    });

    it('should only return active badges', async () => {
      Badge.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { badgeId: 'badge1', isActive: true },
              { badgeId: 'badge2', isActive: true }
            ])
          })
        })
      });

      await badgeService.getBadgeCatalog();

      expect(Badge.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('markBadgeAsViewed', () => {
    it('should throw error if userId or badgeId is missing', async () => {
      await expect(badgeService.markBadgeAsViewed(null, 'badge1')).rejects.toMatchObject({
        statusCode: 400
      });

      await expect(badgeService.markBadgeAsViewed('user1', null)).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should mark badge as viewed', async () => {
      const userId = new mongoose.Types.ObjectId();

      UserBadge.findOneAndUpdate.mockResolvedValue({
        userId,
        badgeIdStr: 'first_read',
        viewedAt: new Date()
      });

      const result = await badgeService.markBadgeAsViewed(userId, 'first_read');

      expect(UserBadge.findOneAndUpdate).toHaveBeenCalledWith(
        { userId, badgeIdStr: 'first_read' },
        expect.objectContaining({ viewedAt: expect.any(Date) }),
        { new: true }
      );
    });

    it('should throw error if badge not found for user', async () => {
      const userId = new mongoose.Types.ObjectId();

      UserBadge.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        badgeService.markBadgeAsViewed(userId, 'nonexistent')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
