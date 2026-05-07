const express = require('express');
const { ingestNewsFromUrl, getNewsCards } = require('../controllers/newsController');
const { validateRequest } = require('../middleware/requestValidation');
const { validateIngestPayload, validateCardsQuery } = require('../validation/newsValidators');

const router = express.Router();

router.get('/ingest/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    route: '/api/news/ingest'
  });
});

router.post('/ingest', validateRequest('body', validateIngestPayload), ingestNewsFromUrl);
router.get('/cards', validateRequest('query', validateCardsQuery), getNewsCards);

module.exports = router;
