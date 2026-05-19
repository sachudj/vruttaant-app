const cohortService = require('../services/cohortService');

/**
 * GET /api/v1/user/cohorts
 * Returns the cohorts the authenticated user belongs to.
 */
async function getUserCohorts(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, statusCode: 401, message: 'Authentication required' });

    const cohorts = await cohortService.getUserCohorts(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'User cohorts retrieved',
      data: { cohorts, total: cohorts.length },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/user/cohorts/refresh
 * Re-evaluates and updates the authenticated user's cohort assignments.
 */
async function refreshUserCohorts(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, statusCode: 401, message: 'Authentication required' });

    const cohorts = await cohortService.assignUserToCohorts(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Cohort assignments refreshed',
      data: { cohorts, total: cohorts.length },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/cohorts/stats
 * Returns aggregate user counts per cohort.  Admin-only.
 */
async function getCohortStats(req, res, next) {
  try {
    const stats = await cohortService.getCohortStats();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Cohort statistics retrieved',
      data: { cohorts: stats, total: stats.length },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/cohorts/:cohortId/users?page=1&limit=20
 * Returns paginated users belonging to a specific cohort.  Admin-only.
 */
async function getCohortUsers(req, res, next) {
  try {
    const { cohortId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const result = await cohortService.getCohortUsers(cohortId, page, limit);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Cohort users retrieved',
      data: result,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserCohorts,
  refreshUserCohorts,
  getCohortStats,
  getCohortUsers
};
