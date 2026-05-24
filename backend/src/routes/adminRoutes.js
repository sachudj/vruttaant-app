const express = require('express');
const { verifyAccessToken, verifyUserExists } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleGuard');
const {
  getDetailedHealth,
  getSystemStats,
  sendAdminNotification,
  getReleaseTelemetry,
  listNewsSources,
  updateNewsSource,
  updateNewsSourcesByLanguage
} = require('../controllers/adminController');
const {
  createLoadTestRun,
  getLoadTestHistory,
  getLoadTestTrends
} = require('../controllers/loadtestController');
const { getCohortStats, getCohortUsers } = require('../controllers/cohortController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyAccessToken, verifyUserExists, requireAdmin);

// GET /admin/health - Detailed health information
router.get('/health', getDetailedHealth);

// GET /admin/stats - System statistics
router.get('/stats', getSystemStats);

// GET /admin/release-telemetry - Release health telemetry snapshot
router.get('/release-telemetry', getReleaseTelemetry);

// GET /admin/sources - Source registry listing and filtering
router.get('/sources', listNewsSources);

// PATCH /admin/sources/:sourceId - Update one source
router.patch('/sources/:sourceId', updateNewsSource);

// PATCH /admin/sources/language/:language - Bulk update all sources by language
router.patch('/sources/language/:language', updateNewsSourcesByLanguage);

// POST /admin/loadtest/runs - Persist load-test execution results
router.post('/loadtest/runs', createLoadTestRun);

// GET /admin/loadtest/history - List recent load-test runs
router.get('/loadtest/history', getLoadTestHistory);

// GET /admin/loadtest/trends - Aggregate trend summary over window
router.get('/loadtest/trends', getLoadTestTrends);

// POST /admin/notifications/send - Send manual notification
router.post('/notifications/send', sendAdminNotification);

// GET /admin/cohorts/stats - Cohort aggregate statistics
router.get('/cohorts/stats', getCohortStats);
// GET /admin/cohorts/:cohortId/users - Paginated users in a cohort
router.get('/cohorts/:cohortId/users', getCohortUsers);

module.exports = router;
