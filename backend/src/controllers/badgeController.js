const badgeService = require('../services/badgeService');

/**
 * Get user's earned badges
 * GET /api/v1/user/badges
 */
const getUserBadges = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
        message: 'User authentication required',
        requestId: req.id
      });
    }

    const badges = await badgeService.getUserBadges(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'User badges retrieved successfully',
      data: {
        badges,
        count: badges.length
      },
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's progress toward earning badges
 * GET /api/v1/user/badges/progress
 */
const getBadgeProgress = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
        message: 'User authentication required',
        requestId: req.id
      });
    }

    const progress = await badgeService.getUserBadgeProgress(userId);

    const earnedCount = progress.filter((p) => p.earned).length;
    const totalCount = progress.length;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Badge progress retrieved successfully',
      data: {
        progress,
        earnedCount,
        totalCount,
        completionPercent: Math.round((earnedCount / totalCount) * 100)
      },
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available badges (catalog)
 * GET /api/v1/badges/catalog
 * Public endpoint - no authentication required
 */
const getBadgeCatalog = async (req, res, next) => {
  try {
    const badges = await badgeService.getBadgeCatalog();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Badge catalog retrieved successfully',
      data: {
        badges,
        count: badges.length,
        categories: [...new Set(badges.map((b) => b.category))]
      },
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a badge as viewed by the user
 * POST /api/v1/user/badges/:badgeId/view
 */
const markBadgeViewed = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { badgeId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
        message: 'User authentication required',
        requestId: req.id
      });
    }

    if (!badgeId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        statusCode: 400,
        message: 'Badge ID is required',
        requestId: req.id
      });
    }

    await badgeService.markBadgeAsViewed(userId, badgeId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Badge marked as viewed',
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluate badges for current user (trigger badge award check)
 * POST /api/v1/user/badges/evaluate
 * Used for testing/manual trigger
 */
const evaluateUserBadges = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
        message: 'User authentication required',
        requestId: req.id
      });
    }

    const newBadges = await badgeService.evaluateAndAwardBadges(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Badge evaluation completed. ${newBadges.length} new badge(s) earned!`,
      data: {
        newBadges,
        count: newBadges.length
      },
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's engagement metrics (used for debugging/analytics)
 * GET /api/v1/user/badges/metrics
 */
const getEngagementMetrics = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
        message: 'User authentication required',
        requestId: req.id
      });
    }

    const metrics = await badgeService.getUserEngagementMetrics(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Engagement metrics retrieved successfully',
      data: metrics,
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserBadges,
  getBadgeProgress,
  getBadgeCatalog,
  markBadgeViewed,
  evaluateUserBadges,
  getEngagementMetrics
};
