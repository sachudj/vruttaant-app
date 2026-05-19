/**
 * User Activity Service
 * 
 * Handles querying and aggregating user activity events (views, bookmarks, translations, shares).
 * Uses the UserActivityEvent model for tracking engagement patterns.
 */

const UserActivityEvent = require('../models/UserActivityEvent');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get paginated user activity history with optional filtering
 * 
 * @param {string} userId - User ID to fetch activity for
 * @param {number} page - Page number (1-based, default 1)
 * @param {number} limit - Items per page (default 20, max 100)
 * @param {object} filters - Optional filters: { eventType, language, category, startDate, endDate }
 * @returns {Promise<object>} - { activities, totalCount, totalPages, hasMore, page, limit }
 * @throws {AppError} - If userId is invalid or query fails
 */
async function getUserActivityHistory(userId, page = 1, limit = 20, filters = {}) {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  // Validate and clamp pagination params
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (validPage - 1) * validLimit;

  // Build query
  const query = { userId };

  if (filters.eventType) {
    query.eventType = filters.eventType;
  }

  if (filters.language) {
    query['cardMetadata.language'] = filters.language;
  }

  if (filters.category) {
    query['cardMetadata.category'] = filters.category;
  }

  // Date range filtering
  if (filters.startDate || filters.endDate) {
    query.eventAt = {};
    if (filters.startDate) {
      query.eventAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.eventAt.$lte = new Date(filters.endDate);
    }
  }

  try {
    const totalCount = await UserActivityEvent.countDocuments(query);
    const totalPages = Math.ceil(totalCount / validLimit);
    const activities = await UserActivityEvent.find(query)
      .sort({ eventAt: -1 })
      .skip(skip)
      .limit(validLimit)
      .lean();

    return {
      activities,
      totalCount,
      totalPages,
      hasMore: validPage < totalPages,
      page: validPage,
      limit: validLimit,
    };
  } catch (error) {
    throw new AppError(500, `Failed to fetch user activity history: ${error.message}`);
  }
}

/**
 * Get user's reading feed (view events with card details)
 * 
 * @param {string} userId - User ID
 * @param {number} limit - Max items to return (default 20, max 100)
 * @returns {Promise<array>} - Array of reading events sorted by recency
 * @throws {AppError} - If userId is invalid or query fails
 */
async function getReadingFeed(userId, limit = 20) {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

  try {
    const readingEvents = await UserActivityEvent.find({
      userId,
      eventType: 'view',
    })
      .sort({ eventAt: -1 })
      .limit(validLimit)
      .lean();

    return readingEvents;
  } catch (error) {
    throw new AppError(500, `Failed to fetch reading feed: ${error.message}`);
  }
}

/**
 * Get aggregate activity statistics for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<object>} - { totalViews, totalBookmarks, totalTranslations, totalShares, topCategories, topLanguages, lastActivityAt }
 * @throws {AppError} - If userId is invalid or query fails
 */
async function getUserActivityStats(userId) {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  try {
    const stats = await UserActivityEvent.aggregate([
      { $match: { userId } },
      {
        $facet: {
          eventTypeCounts: [
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
          ],
          topCategories: [
            { $group: { _id: '$cardMetadata.category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
          topLanguages: [
            { $group: { _id: '$cardMetadata.language', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
          lastActivity: [
            { $sort: { eventAt: -1 } },
            { $limit: 1 },
            { $project: { eventAt: 1 } },
          ],
        },
      },
    ]);

    if (!stats || stats.length === 0) {
      return {
        totalViews: 0,
        totalBookmarks: 0,
        totalTranslations: 0,
        totalShares: 0,
        topCategories: [],
        topLanguages: [],
        lastActivityAt: null,
      };
    }

    const facetResult = stats[0];
    const eventTypeCounts = facetResult.eventTypeCounts.reduce(
      (acc, curr) => {
        acc[`total${curr._id.charAt(0).toUpperCase()}${curr._id.slice(1)}`] = curr.count;
        return acc;
      },
      {},
    );

    return {
      totalViews: eventTypeCounts.totalView || 0,
      totalBookmarks: eventTypeCounts.totalBookmark || 0,
      totalTranslations: eventTypeCounts.totalTranslate || 0,
      totalShares: eventTypeCounts.totalShare || 0,
      topCategories: facetResult.topCategories,
      topLanguages: facetResult.topLanguages,
      lastActivityAt: facetResult.lastActivity.length > 0 ? facetResult.lastActivity[0].eventAt : null,
    };
  } catch (error) {
    throw new AppError(500, `Failed to compute activity stats: ${error.message}`);
  }
}

/**
 * Get activity events for a specific news card
 * Useful for understanding reader engagement with a particular article
 * 
 * @param {string} newsCardId - News card ID
 * @param {number} limit - Max items to return (default 50, max 500)
 * @returns {Promise<array>} - Array of activity events for the card
 * @throws {AppError} - If newsCardId is invalid or query fails
 */
async function getCardActivityMetrics(newsCardId, limit = 50) {
  if (!newsCardId) {
    throw new AppError(400, 'News card ID is required');
  }

  const validLimit = Math.min(500, Math.max(1, parseInt(limit) || 50));

  try {
    const activities = await UserActivityEvent.find({ newsCardId })
      .sort({ eventAt: -1 })
      .limit(validLimit)
      .lean();

    return activities;
  } catch (error) {
    throw new AppError(500, `Failed to fetch card activity metrics: ${error.message}`);
  }
}

module.exports = {
  getUserActivityHistory,
  getReadingFeed,
  getUserActivityStats,
  getCardActivityMetrics,
};
