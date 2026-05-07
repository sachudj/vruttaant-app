const express = require('express');
const { verifyAccessToken, verifyUserExists } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleGuard');
const {
  getDetailedHealth,
  getSystemStats
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyAccessToken, verifyUserExists, requireAdmin);

// GET /admin/health - Detailed health information
router.get('/health', getDetailedHealth);

// GET /admin/stats - System statistics
router.get('/stats', getSystemStats);

module.exports = router;
