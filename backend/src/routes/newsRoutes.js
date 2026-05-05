const express = require('express');
const { ingestNewsFromUrl, getNewsCards } = require('../controllers/newsController');

const router = express.Router();

router.get('/ingest/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    route: '/api/news/ingest'
  });
});

router.post('/ingest', ingestNewsFromUrl);
router.get('/cards', getNewsCards);

module.exports = router;
