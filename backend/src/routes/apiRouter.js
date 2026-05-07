const express = require('express');
const newsRoutes = require('./newsRoutes');

const apiRouter = express.Router();

// Mount versioned API routes
apiRouter.use('/v1/news', newsRoutes);

// Backwards compatibility: also mount at non-versioned path (deprecated)
apiRouter.use('/news', (req, res, next) => {
  console.warn(`[DEPRECATION] Non-versioned news endpoint called. Use /api/v1/news instead.`);
  next();
});
apiRouter.use('/news', newsRoutes);

module.exports = apiRouter;
