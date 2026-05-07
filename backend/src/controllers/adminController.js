const User = require('../models/User');
const Bookmark = require('../models/Bookmark');
const NewsCard = require('../models/NewsCard');
const RefreshToken = require('../models/RefreshToken');

/**
 * Get detailed health information (admin only)
 * Includes database connections, model counts, memory usage
 */
async function getDetailedHealth(req, res, next) {
  try {
    const mongooseConnection = require('../config/database').getConnection();

    // Check database connection
    const dbConnected = mongooseConnection.readyState === 1; // 1 = connected

    // Get collection statistics
    const [userCount, bookmarkCount, newsCardCount, revokedTokenCount] = await Promise.all([
      User.countDocuments(),
      Bookmark.countDocuments(),
      NewsCard.countDocuments(),
      RefreshToken.countDocuments({ revokedAt: { $ne: null } })
    ]);

    // Get admin count for verification
    const adminCount = await User.countDocuments({ role: 'admin' });

    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    res.status(200).json({
      success: true,
      data: {
        health: {
          status: dbConnected ? 'healthy' : 'unhealthy',
          timestamp,
          uptime: Math.floor(uptime),
          uptimeSeconds: uptime
        },
        database: {
          connected: dbConnected,
          readyState: mongooseConnection.readyState
        },
        collections: {
          users: {
            total: userCount,
            admins: adminCount,
            regularUsers: userCount - adminCount
          },
          bookmarks: bookmarkCount,
          newsCards: newsCardCount,
          refreshTokens: {
            active: await RefreshToken.countDocuments({ revokedAt: null }),
            revoked: revokedTokenCount
          }
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get system statistics (admin only)
 * User engagement, bookmark trends, etc.
 */
async function getSystemStats(req, res, next) {
  try {
    // Get time-based statistics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Active users in last 30 days (had login activity)
    const activeUsersThirtyDays = await User.countDocuments({
      lastLoginAt: { $gte: thirtyDaysAgo }
    });

    // Active users in last 7 days
    const activeUsersSevenDays = await User.countDocuments({
      lastLoginAt: { $gte: sevenDaysAgo }
    });

    // Bookmarks created in last 30 days
    const bookmarksThirtyDays = await Bookmark.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // News cards created in last 30 days
    const newsCardsThirtyDays = await NewsCard.countDocuments({
      scrapedAt: { $gte: thirtyDaysAgo }
    });

    // Average bookmarks per user
    const totalUsers = await User.countDocuments();
    const totalBookmarks = await Bookmark.countDocuments();
    const avgBookmarksPerUser = totalUsers > 0 ? (totalBookmarks / totalUsers).toFixed(2) : 0;

    // Most bookmarked categories
    const topCategories = await Bookmark.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const timestamp = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: {
        stats: {
          timestamp,
          period: '30_days',
          users: {
            total: totalUsers,
            active30d: activeUsersThirtyDays,
            active7d: activeUsersSevenDays
          },
          bookmarks: {
            total: totalBookmarks,
            created30d: bookmarksThirtyDays,
            avgPerUser: parseFloat(avgBookmarksPerUser)
          },
          newsCards: {
            total: await NewsCard.countDocuments(),
            created30d: newsCardsThirtyDays
          },
          topBookmarkedCategories: topCategories.map(cat => ({
            category: cat._id,
            count: cat.count
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDetailedHealth,
  getSystemStats
};
