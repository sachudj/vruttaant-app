const express = require('express');
const {
  submitEvent,
  getTrendingCards,
  getTopCategoriesMetrics,
  getCardMetrics,
  getUserEngagement
} = require('../controllers/analyticsController');
const { validateRequest } = require('../middleware/requestValidation');
const { verifyAccessToken, verifyUserExists } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleGuard');
const { validateEventPayload, validateAnalyticsQuery } = require('../validation/analyticsValidators');

const router = express.Router();

// Public endpoint: submit events (optional auth for userId tracking)
router.post(
  '/events',
  (req, res, next) => {
    // Soft auth: try to get user, but continue if no valid token
    if (req.headers.authorization) {
      return verifyAccessToken(req, res, next);
    }
    next();
  },
  validateRequest('body', validateEventPayload),
  submitEvent
);

// Protected endpoints: analytics dashboard (admin only)
router.get('/trending', verifyAccessToken, verifyUserExists, requireAdmin, getTrendingCards);
router.get('/categories', verifyAccessToken, verifyUserExists, requireAdmin, getTopCategoriesMetrics);
router.get('/card/:cardId/metrics', verifyAccessToken, verifyUserExists, requireAdmin, getCardMetrics);

// Protected endpoints: user analytics (requires authentication)
router.get('/user/engagement', verifyAccessToken, verifyUserExists, getUserEngagement);

module.exports = router;
