const express = require('express');
const { ingestNewsFromUrl, getNewsCards, translateNewsStory } = require('../controllers/newsController');
const { validateRequest } = require('../middleware/requestValidation');
const { optionalAuth } = require('../middleware/authMiddleware');
const {
  validateIngestPayload,
  validateCardsQuery,
  validateTranslatePayload
} = require('../validation/newsValidators');

const router = express.Router();

router.get('/ingest/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    route: '/api/news/ingest'
  });
});

router.post('/ingest', validateRequest('body', validateIngestPayload), ingestNewsFromUrl);
router.get('/cards', optionalAuth, validateRequest('query', validateCardsQuery), getNewsCards);
router.post('/translate', validateRequest('body', validateTranslatePayload), translateNewsStory);

module.exports = router;
