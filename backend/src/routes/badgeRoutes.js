const express = require('express');
const { getBadgeCatalog } = require('../controllers/badgeController');

const router = express.Router();

// Public endpoint - no authentication required
router.get('/catalog', getBadgeCatalog);

module.exports = router;
