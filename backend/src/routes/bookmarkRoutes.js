const express = require('express');
const { validateRequest } = require('../middleware/requestValidation');
const { verifyAccessToken, verifyUserExists } = require('../middleware/authMiddleware');
const {
  validateCreateBookmarkPayload,
  validateListBookmarksQuery,
  validateDeleteBookmarkParams
} = require('../validation/bookmarkValidators');
const {
  createBookmark,
  listBookmarks,
  deleteBookmark
} = require('../controllers/bookmarkController');

const router = express.Router();

// All bookmark routes require authentication
router.use(verifyAccessToken, verifyUserExists);

// POST /bookmarks - Create bookmark
router.post(
  '/',
  validateRequest('body', validateCreateBookmarkPayload),
  createBookmark
);

// GET /bookmarks - List user's bookmarks
router.get(
  '/',
  validateRequest('query', validateListBookmarksQuery),
  listBookmarks
);

// DELETE /bookmarks/:id - Delete bookmark
router.delete(
  '/:id',
  validateRequest('params', validateDeleteBookmarkParams),
  deleteBookmark
);

module.exports = router;
