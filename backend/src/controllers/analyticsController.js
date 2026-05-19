const UserActivityEvent = require('../models/UserActivityEvent');
const {
  getTrendingContent,
  getCardEngagementMetrics,
  getUserEngagementSummary,
  getTopCategories
} = require('../services/analyticsService');
const { isDatabaseConnected } = require('../health/readiness');
const {
  TTL,
  cacheGet,
  cacheSet,
  buildTrendingKey,
  buildCategoriesKey
} = require('../services/cacheService');

/**
 * POST /api/v1/analytics/events
 * Submit user activity events from mobile/web clients
 */
const submitEvent = async (req, res, next) => {
  try {
    // Check database connection
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const { eventType, newsCardId, duration, translation, deviceMetadata } = req.body;

    // Create event document
    const event = {
      userId: req.user?._id || req.user?.id || undefined,
      sessionId: req.sessionId || undefined,
      eventType,
      newsCardId,
      duration: duration || undefined,
      translation,
      deviceMetadata
    };

    // Fetch card metadata for analytics preservation
    try {
      const NewsCard = require('../models/NewsCard');
      const card = await NewsCard.findById(newsCardId).lean();
      if (card) {
        event.cardMetadata = {
          title: card.title,
          category: card.category,
          language: card.language,
          source: card.source,
          publishedAt: card.publishedAt
        };
      }
    } catch (err) {
      // Non-critical: continue without metadata
    }

    await UserActivityEvent.create(event);

    res.status(201).json({
      success: true,
      message: 'Event recorded successfully.',
      eventId: event._id
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/trending
 * Get trending content by view count (requires admin role)
 */
const getTrendingCards = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const { category, startDate, endDate, limit } = req.query;

    const options = {
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Math.min(Number(limit), 50) : 20
    };

    const trendingKey = buildTrendingKey({ limit: options.limit });
    // Only cache when no date filters are applied (generic trending list)
    const useTrendingCache = !startDate && !endDate && !category;
    if (useTrendingCache) {
      const cached = await cacheGet(trendingKey);
      if (cached) {
        return res.status(200).json(cached);
      }
    }

    const trending = await getTrendingContent(options);

    const trendingPayload = {
      success: true,
      message: 'Trending content retrieved successfully.',
      trending,
      count: trending.length
    };

    if (useTrendingCache) {
      await cacheSet(trendingKey, trendingPayload, TTL.ANALYTICS_TRENDING);
    }

    res.status(200).json(trendingPayload);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/categories
 * Get top categories by engagement (requires admin role)
 */
const getTopCategoriesMetrics = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const { startDate, endDate, limit } = req.query;

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Math.min(Number(limit), 50) : 10
    };

    const categoriesKey = buildCategoriesKey({ limit: options.limit });
    const useCategoriesCache = !startDate && !endDate;
    if (useCategoriesCache) {
      const cached = await cacheGet(categoriesKey);
      if (cached) {
        return res.status(200).json(cached);
      }
    }

    const categories = await getTopCategories(options);

    const categoriesPayload = {
      success: true,
      message: 'Top categories retrieved successfully.',
      categories,
      count: categories.length
    };

    if (useCategoriesCache) {
      await cacheSet(categoriesKey, categoriesPayload, TTL.ANALYTICS_CATEGORIES);
    }

    res.status(200).json(categoriesPayload);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/card/:cardId/metrics
 * Get engagement metrics for a specific card (requires admin role)
 */
const getCardMetrics = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const { cardId } = req.params;

    const metrics = await getCardEngagementMetrics(cardId);

    res.status(200).json({
      success: true,
      message: 'Card engagement metrics retrieved successfully.',
      cardId,
      metrics
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/user/engagement
 * Get current user's engagement summary (requires authentication)
 */
const getUserEngagement = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const summary = await getUserEngagementSummary(req.user._id);

    res.status(200).json({
      success: true,
      message: 'User engagement summary retrieved successfully.',
      engagement: summary
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitEvent,
  getTrendingCards,
  getTopCategoriesMetrics,
  getCardMetrics,
  getUserEngagement
};
