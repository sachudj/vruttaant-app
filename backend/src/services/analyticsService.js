const UserActivityEvent = require('../models/UserActivityEvent');
const logger = require('../observability/logger');

/**
 * Get trending content by view count over a time period
 */
const getTrendingContent = async (options = {}) => {
  const { startDate, endDate, category, limit = 10 } = options;

  const pipeline = [
    // Filter by date range
    {
      $match: {
        eventType: 'view',
        eventAt: {
          $gte: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: last 7 days
          $lte: endDate || new Date()
        }
      }
    },
    // Filter by category if provided
    ...(category ? [{ $match: { 'cardMetadata.category': category } }] : []),
    // Group by card
    {
      $group: {
        _id: '$newsCardId',
        viewCount: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        title: { $first: '$cardMetadata.title' },
        source: { $first: '$cardMetadata.source' },
        category: { $first: '$cardMetadata.category' },
        language: { $first: '$cardMetadata.language' },
        firstViewedAt: { $min: '$eventAt' }
      }
    },
    // Sort by view count
    { $sort: { viewCount: -1 } },
    // Limit results
    { $limit: limit }
  ];

  try {
    const results = await UserActivityEvent.aggregate(pipeline);
    return results;
  } catch (err) {
    logger.error('Failed to get trending content', { error: err.message });
    return [];
  }
};

/**
 * Get engagement metrics for a specific news card
 */
const getCardEngagementMetrics = async (cardId) => {
  const pipeline = [
    { $match: { newsCardId: cardId } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ];

  try {
    const results = await UserActivityEvent.aggregate(pipeline);

    // Transform into object with event type keys
    const metrics = {
      views: 0,
      bookmarks: 0,
      translates: 0,
      shares: 0,
      avgViewDuration: 0
    };

    results.forEach((result) => {
      if (result._id === 'view') {
        metrics.views = result.count;
        metrics.avgViewDuration = Math.round(result.avgDuration || 0);
      } else if (result._id === 'bookmark') {
        metrics.bookmarks = result.count;
      } else if (result._id === 'translate') {
        metrics.translates = result.count;
      } else if (result._id === 'share') {
        metrics.shares = result.count;
      }
    });

    // Calculate engagement rate (bookmarks + translates + shares) / views
    metrics.engagementRate =
      metrics.views > 0 ? (metrics.bookmarks + metrics.translates + metrics.shares) / metrics.views : 0;

    return metrics;
  } catch (err) {
    logger.error('Failed to get card engagement metrics', { error: err.message, cardId });
    return { views: 0, bookmarks: 0, translates: 0, shares: 0, avgViewDuration: 0, engagementRate: 0 };
  }
};

/**
 * Get user engagement summary (for user profile)
 */
const getUserEngagementSummary = async (userId) => {
  const pipeline = [
    { $match: { userId } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        lastEventAt: { $max: '$eventAt' }
      }
    }
  ];

  try {
    const results = await UserActivityEvent.aggregate(pipeline);

    const summary = {
      totalViews: 0,
      totalBookmarks: 0,
      totalTranslates: 0,
      totalShares: 0,
      lastActivityAt: null
    };

    let lastEventTime = null;

    results.forEach((result) => {
      if (result._id === 'view') summary.totalViews = result.count;
      else if (result._id === 'bookmark') summary.totalBookmarks = result.count;
      else if (result._id === 'translate') summary.totalTranslates = result.count;
      else if (result._id === 'share') summary.totalShares = result.count;

      if (!lastEventTime || result.lastEventAt > lastEventTime) {
        lastEventTime = result.lastEventAt;
      }
    });

    summary.lastActivityAt = lastEventTime;
    summary.totalEvents = summary.totalViews + summary.totalBookmarks + summary.totalTranslates + summary.totalShares;

    return summary;
  } catch (err) {
    logger.error('Failed to get user engagement summary', { error: err.message, userId });
    return {
      totalViews: 0,
      totalBookmarks: 0,
      totalTranslates: 0,
      totalShares: 0,
      lastActivityAt: null,
      totalEvents: 0
    };
  }
};

/**
 * Get top categories by engagement
 */
const getTopCategories = async (options = {}) => {
  const { startDate, endDate, limit = 10 } = options;

  const pipeline = [
    {
      $match: {
        'cardMetadata.category': { $exists: true, $ne: null },
        eventAt: {
          $gte: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          $lte: endDate || new Date()
        }
      }
    },
    {
      $group: {
        _id: '$cardMetadata.category',
        views: { $sum: { $cond: [{ $eq: ['$eventType', 'view'] }, 1, 0] } },
        bookmarks: { $sum: { $cond: [{ $eq: ['$eventType', 'bookmark'] }, 1, 0] } },
        translates: { $sum: { $cond: [{ $eq: ['$eventType', 'translate'] }, 1, 0] } },
        engagement: { $sum: { $cond: [{ $ne: ['$eventType', 'view'] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        engagementRate: {
          $cond: [{ $gt: ['$views', 0] }, { $divide: ['$engagement', '$views'] }, 0]
        }
      }
    },
    { $sort: { engagement: -1 } },
    { $limit: limit }
  ];

  try {
    const results = await UserActivityEvent.aggregate(pipeline);
    return results;
  } catch (err) {
    logger.error('Failed to get top categories', { error: err.message });
    return [];
  }
};

module.exports = {
  getTrendingContent,
  getCardEngagementMetrics,
  getUserEngagementSummary,
  getTopCategories
};
