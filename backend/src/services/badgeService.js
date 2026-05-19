const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const UserActivityEvent = require('../models/UserActivityEvent');
const { AppError } = require('../middleware/errorHandler');

/**
 * Badge Service
 * Handles badge evaluation, awarding, and retrieval
 */

/**
 * Initialize default badge definitions in the database
 * Should be called once during application startup
 */
const initializeBadgeDefinitions = async () => {
  const defaultBadges = [
    // View Milestones
    {
      badgeId: 'first_read',
      name: 'First Read',
      description: 'Read your first article',
      category: 'views',
      icon: '📖',
      color: '#FF6B6B',
      tier: 'bronze',
      criteria: { type: 'total_views', threshold: 1, operator: 'gte' },
      displayOrder: 1
    },
    {
      badgeId: 'avid_reader',
      name: 'Avid Reader',
      description: 'Read 10 articles',
      category: 'views',
      icon: '📚',
      color: '#4ECDC4',
      tier: 'bronze',
      criteria: { type: 'total_views', threshold: 10, operator: 'gte' },
      displayOrder: 2
    },
    {
      badgeId: 'news_junkie',
      name: 'News Junkie',
      description: 'Read 50 articles',
      category: 'views',
      icon: '🔥',
      color: '#FFD93D',
      tier: 'silver',
      criteria: { type: 'total_views', threshold: 50, operator: 'gte' },
      displayOrder: 3
    },
    {
      badgeId: 'bookworm',
      name: 'Bookworm',
      description: 'Read 100 articles',
      category: 'views',
      icon: '📖🐛',
      color: '#6BCB77',
      tier: 'gold',
      criteria: { type: 'total_views', threshold: 100, operator: 'gte' },
      displayOrder: 4
    },

    // Category Milestones
    {
      badgeId: 'topic_explorer',
      name: 'Topic Explorer',
      description: 'Read articles from 5 different categories',
      category: 'categories',
      icon: '🗺️',
      color: '#4D96FF',
      tier: 'bronze',
      criteria: { type: 'total_categories', threshold: 5, operator: 'gte' },
      displayOrder: 5
    },
    {
      badgeId: 'category_master',
      name: 'Category Master',
      description: 'Read articles from 10 different categories',
      category: 'categories',
      icon: '🎯',
      color: '#A78BFA',
      tier: 'gold',
      criteria: { type: 'total_categories', threshold: 10, operator: 'gte' },
      displayOrder: 6
    },

    // Bookmark Milestones
    {
      badgeId: 'bookmarking_pro',
      name: 'Bookmarking Pro',
      description: 'Bookmark 5 articles',
      category: 'bookmarks',
      icon: '🔖',
      color: '#FF85C0',
      tier: 'bronze',
      criteria: { type: 'total_bookmarks', threshold: 5, operator: 'gte' },
      displayOrder: 7
    },
    {
      badgeId: 'save_master',
      name: 'Save Master',
      description: 'Bookmark 25 articles',
      category: 'bookmarks',
      icon: '💾',
      color: '#FB6467',
      tier: 'silver',
      criteria: { type: 'total_bookmarks', threshold: 25, operator: 'gte' },
      displayOrder: 8
    },

    // Translation Milestones
    {
      badgeId: 'translator',
      name: 'Translator',
      description: 'Translate 5 articles',
      category: 'translations',
      icon: '🌐',
      color: '#00D9FF',
      tier: 'bronze',
      criteria: { type: 'total_translations', threshold: 5, operator: 'gte' },
      displayOrder: 9
    },
    {
      badgeId: 'polyglot',
      name: 'Polyglot',
      description: 'Read articles in 3 different languages',
      category: 'translations',
      icon: '🗣️',
      color: '#FF6B9D',
      tier: 'silver',
      criteria: { type: 'unique_languages', threshold: 3, operator: 'gte' },
      displayOrder: 10
    },

    // Share Milestones
    {
      badgeId: 'social_sharer',
      name: 'Social Sharer',
      description: 'Share 5 articles with others',
      category: 'shares',
      icon: '📢',
      color: '#C44569',
      tier: 'bronze',
      criteria: { type: 'total_shares', threshold: 5, operator: 'gte' },
      displayOrder: 11
    },

    // Engagement Milestone
    {
      badgeId: 'engaged_reader',
      name: 'Engaged Reader',
      description: 'Read 20 or more articles',
      category: 'engagement',
      icon: '⭐',
      color: '#FFD700',
      tier: 'silver',
      criteria: { type: 'total_views', threshold: 20, operator: 'gte' },
      displayOrder: 12
    }
  ];

  try {
    for (const badgeDef of defaultBadges) {
      await Badge.findOneAndUpdate(
        { badgeId: badgeDef.badgeId },
        badgeDef,
        { upsert: true, new: true }
      );
    }
    console.log(`✓ Badge definitions initialized (${defaultBadges.length} badges)`);
  } catch (error) {
    console.error('Error initializing badge definitions:', error.message);
    throw error;
  }
};

/**
 * Get user's engagement metrics needed for badge evaluation
 */
const getUserEngagementMetrics = async (userId) => {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  try {
    const [metrics] = await UserActivityEvent.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: { $cond: [{ $eq: ['$eventType', 'view'] }, 1, 0] }
          },
          totalBookmarks: {
            $sum: { $cond: [{ $eq: ['$eventType', 'bookmark'] }, 1, 0] }
          },
          totalTranslations: {
            $sum: { $cond: [{ $eq: ['$eventType', 'translate'] }, 1, 0] }
          },
          totalShares: {
            $sum: { $cond: [{ $eq: ['$eventType', 'share'] }, 1, 0] }
          },
          viewCategories: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'view'] },
                    { $ne: ['$cardMetadata.category', null] },
                    { $ne: ['$cardMetadata.category', ''] }
                  ]
                },
                '$cardMetadata.category',
                '$$REMOVE'
              ]
            }
          },
          viewLanguages: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'view'] },
                    { $ne: ['$cardMetadata.language', null] },
                    { $ne: ['$cardMetadata.language', ''] }
                  ]
                },
                '$cardMetadata.language',
                '$$REMOVE'
              ]
            }
          },
          translatedLanguages: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'translate'] },
                    { $ne: ['$translation.toLanguage', null] },
                    { $ne: ['$translation.toLanguage', ''] }
                  ]
                },
                '$translation.toLanguage',
                '$$REMOVE'
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalViews: 1,
          totalBookmarks: 1,
          totalTranslations: 1,
          totalShares: 1,
          totalCategories: { $size: '$viewCategories' },
          totalLanguages: {
            $size: { $setUnion: ['$viewLanguages', '$translatedLanguages'] }
          },
          totalActions: {
            $add: ['$totalViews', '$totalBookmarks', '$totalTranslations', '$totalShares']
          }
        }
      }
    ]);

    return metrics || {
      totalViews: 0,
      totalBookmarks: 0,
      totalTranslations: 0,
      totalShares: 0,
      totalCategories: 0,
      totalLanguages: 0,
      totalActions: 0
    };
  } catch (error) {
    throw new AppError(500, `Failed to retrieve engagement metrics: ${error.message}`);
  }
};

/**
 * Check if user meets criteria for a badge
 */
const checkBadgeCriteria = (badge, metrics) => {
  const { criteria } = badge;

  if (!criteria || !criteria.type) {
    return false;
  }

  let metricValue = 0;

  switch (criteria.type) {
    case 'total_views':
      metricValue = metrics.totalViews;
      break;
    case 'total_bookmarks':
      metricValue = metrics.totalBookmarks;
      break;
    case 'total_translations':
      metricValue = metrics.totalTranslations;
      break;
    case 'total_shares':
      metricValue = metrics.totalShares;
      break;
    case 'total_categories':
      metricValue = metrics.totalCategories;
      break;
    case 'unique_languages':
      metricValue = metrics.totalLanguages;
      break;
    default:
      return false;
  }

  const { threshold, operator } = criteria;

  switch (operator) {
    case 'gte':
      return metricValue >= threshold;
    case 'gt':
      return metricValue > threshold;
    case 'eq':
      return metricValue === threshold;
    default:
      return false;
  }
};

/**
 * Helper: map criteria type to metrics key
 */
const getMetricKey = (criteriaType) => {
  const map = {
    total_views: 'totalViews',
    total_bookmarks: 'totalBookmarks',
    total_translations: 'totalTranslations',
    total_shares: 'totalShares',
    total_categories: 'totalCategories',
    unique_languages: 'totalLanguages'
  };
  return map[criteriaType] || null;
};

/**
 * Evaluate all badges for a user and award new ones
 */
const evaluateAndAwardBadges = async (userId) => {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  try {
    // Get all active badge definitions
    const allBadges = await Badge.find({ isActive: true })
      .select('badgeId name icon criteria')
      .lean();

    if (allBadges.length === 0) {
      throw new AppError(500, 'No badge definitions found in system');
    }

    // Get user's engagement metrics
    const metrics = await getUserEngagementMetrics(userId);

    // Get badges user already has
    const earnedUserBadges = await UserBadge.find({ userId }).select('badgeIdStr').lean();
    const earnedBadgeIds = new Set(earnedUserBadges.map((ub) => ub.badgeIdStr));

    const newBadgesAwarded = [];

    // Check each badge
    for (const badge of allBadges) {
      // Skip if user already has this badge
      if (earnedBadgeIds.has(badge.badgeId)) {
        continue;
      }

      // Check if user meets criteria
      if (checkBadgeCriteria(badge, metrics)) {
        // Award the badge
        const metricKey = getMetricKey(badge.criteria.type);
        const userBadge = new UserBadge({
          userId,
          badgeId: badge._id,
          badgeIdStr: badge.badgeId,
          earnedAt: new Date(),
          metricValue: metricKey ? metrics[metricKey] : null
        });

        await userBadge.save();
        newBadgesAwarded.push({
          badgeId: badge.badgeId,
          name: badge.name,
          icon: badge.icon
        });
      }
    }

    return newBadgesAwarded;
  } catch (error) {
    if (error.statusCode) throw error;
    throw new AppError(500, `Failed to evaluate badges: ${error.message}`);
  }
};

/**
 * Get user's earned badges with details
 */
const getUserBadges = async (userId) => {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  try {
    const userBadges = await UserBadge.find({ userId })
      .populate({
        path: 'badgeId',
        model: 'Badge',
        select: 'badgeId name description icon color tier category'
      })
      .sort({ earnedAt: -1 });

    return userBadges.map((ub) => ({
      badgeId: ub.badgeIdStr,
      name: ub.badgeId?.name,
      description: ub.badgeId?.description,
      icon: ub.badgeId?.icon,
      color: ub.badgeId?.color,
      tier: ub.badgeId?.tier,
      category: ub.badgeId?.category,
      earnedAt: ub.earnedAt,
      viewedAt: ub.viewedAt
    }));
  } catch (error) {
    throw new AppError(500, `Failed to retrieve user badges: ${error.message}`);
  }
};

/**
 * Get user's progress toward earning badges
 */
const getUserBadgeProgress = async (userId) => {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  try {
    const metrics = await getUserEngagementMetrics(userId);
    const allBadges = await Badge.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .select('badgeId name description icon tier category criteria')
      .lean();

    const earnedUserBadges = await UserBadge.find({ userId }).select('badgeIdStr').lean();
    const earnedBadgeIds = new Set(earnedUserBadges.map((ub) => ub.badgeIdStr));

    const progress = [];

    for (const badge of allBadges) {
      const earned = earnedBadgeIds.has(badge.badgeId);

      if (!earned) {
        let currentValue = 0;
        const { threshold } = badge.criteria;

        switch (badge.criteria.type) {
          case 'total_views':
            currentValue = metrics.totalViews;
            break;
          case 'total_bookmarks':
            currentValue = metrics.totalBookmarks;
            break;
          case 'total_translations':
            currentValue = metrics.totalTranslations;
            break;
          case 'total_shares':
            currentValue = metrics.totalShares;
            break;
          case 'total_categories':
            currentValue = metrics.totalCategories;
            break;
          case 'unique_languages':
            currentValue = metrics.totalLanguages;
            break;
        }

        const progressPercent = Math.min(100, Math.round((currentValue / threshold) * 100));

        progress.push({
          badgeId: badge.badgeId,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          tier: badge.tier,
          category: badge.category,
          currentValue,
          threshold,
          progressPercent,
          earned: false
        });
      } else {
        progress.push({
          badgeId: badge.badgeId,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          tier: badge.tier,
          category: badge.category,
          earned: true
        });
      }
    }

    return progress;
  } catch (error) {
    if (error.statusCode) throw error;
    throw new AppError(500, `Failed to retrieve badge progress: ${error.message}`);
  }
};

/**
 * Get badge catalog (all available badges)
 */
const getBadgeCatalog = async () => {
  try {
    const badges = await Badge.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .select('badgeId name description icon color tier category')
      .lean();

    return badges;
  } catch (error) {
    throw new AppError(500, `Failed to retrieve badge catalog: ${error.message}`);
  }
};

/**
 * Mark badge as viewed by user
 */
const markBadgeAsViewed = async (userId, badgeId) => {
  if (!userId || !badgeId) {
    throw new AppError(400, 'User ID and Badge ID are required');
  }

  try {
    const userBadge = await UserBadge.findOneAndUpdate(
      { userId, badgeIdStr: badgeId },
      { viewedAt: new Date() },
      { new: true }
    );

    if (!userBadge) {
      throw new AppError(404, 'Badge not found for this user');
    }

    return userBadge;
  } catch (error) {
    if (error.statusCode) throw error;
    throw new AppError(500, `Failed to mark badge as viewed: ${error.message}`);
  }
};

module.exports = {
  initializeBadgeDefinitions,
  getUserEngagementMetrics,
  checkBadgeCriteria,
  evaluateAndAwardBadges,
  getUserBadges,
  getUserBadgeProgress,
  getBadgeCatalog,
  markBadgeAsViewed
};
