const express = require('express');
const newsRoutes = require('./newsRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const bookmarkRoutes = require('./bookmarkRoutes');
const adminRoutes = require('./adminRoutes');
const analyticsRoutes = require('./analyticsRoutes');

const apiRouter = express.Router();

// Mount versioned API routes
apiRouter.use('/v1/news', newsRoutes);
apiRouter.use('/v1/auth', authRoutes);
apiRouter.use('/v1/user', userRoutes);
apiRouter.use('/v1/user/bookmarks', bookmarkRoutes);
apiRouter.use('/v1/admin', adminRoutes);
apiRouter.use('/v1/analytics', analyticsRoutes);

// Backwards compatibility: also mount at non-versioned path (deprecated)
apiRouter.use('/news', (req, res, next) => {
  console.warn(`[DEPRECATION] Non-versioned news endpoint called. Use /api/v1/news instead.`);
  next();
});
apiRouter.use('/news', newsRoutes);

apiRouter.use('/auth', (req, res, next) => {
  console.warn(`[DEPRECATION] Non-versioned auth endpoint called. Use /api/v1/auth instead.`);
  next();
});
apiRouter.use('/auth', authRoutes);

module.exports = apiRouter;
