const express = require('express');
const { verifyAccessToken, verifyUserExists } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleGuard');
const {
  getDetailedHealth,
  getSystemStats,
  sendAdminNotification,
  getReleaseTelemetry
} = require('../controllers/adminController');
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

// POST /admin/notifications/send - Send manual notification
router.post('/notifications/send', sendAdminNotification);

// GET /admin/cohorts/stats - Cohort aggregate statistics
router.get('/cohorts/stats', getCohortStats);
// GET /admin/cohorts/:cohortId/users - Paginated users in a cohort
router.get('/cohorts/:cohortId/users', getCohortUsers);

module.exports = router;
