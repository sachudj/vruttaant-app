const Bookmark = require('../models/Bookmark');
const { AppError } = require('../middleware/errorHandler');
const { rewriteImageUrl } = require('../services/imageCdnService');

/**
 * Create a bookmark for authenticated user
 * POST /api/v1/user/bookmarks
 */
async function createBookmark(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError(401, 'User ID not found in token claims.'));
    }

    const { title, url, summary, category, imageUrl, source, language, notes } = req.validated.body;

    // Check if user already bookmarked this URL
    const existingBookmark = await Bookmark.findOne({ userId, url });
    if (existingBookmark) {
      return next(new AppError(409, 'You have already bookmarked this article.'));
    }

    const bookmark = await Bookmark.create({
      userId,
      title,
      url,
      summary,
      category,
      imageUrl,
      source,
      language,
      notes,
      addedAt: new Date()
    });

    res.status(201).json({
      success: true,
      data: {
        bookmark: {
          id: String(bookmark._id),
          title: bookmark.title,
          url: bookmark.url,
          summary: bookmark.summary,
          category: bookmark.category,
          imageUrl: rewriteImageUrl(bookmark.imageUrl),
          source: bookmark.source,
          language: bookmark.language,
          notes: bookmark.notes,
          addedAt: bookmark.addedAt,
          createdAt: bookmark.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List bookmarks for authenticated user
 * GET /api/v1/user/bookmarks
 * Query params: category, language, page, limit
 */
async function listBookmarks(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError(401, 'User ID not found in token claims.'));
    }

    const { category, language, page, limit } = req.validated.query;

    // Build query filter
    const filter = { userId };
    if (category) {
      filter.category = category;
    }
    if (language) {
      filter.language = language;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch bookmarks and total count
    const [bookmarks, total] = await Promise.all([
      Bookmark.find(filter)
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Bookmark.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookmarks: bookmarks.map(b => ({
          id: String(b._id),
          title: b.title,
          url: b.url,
          summary: b.summary,
          category: b.category,
          imageUrl: rewriteImageUrl(b.imageUrl),
          source: b.source,
          language: b.language,
          notes: b.notes,
          addedAt: b.addedAt,
          createdAt: b.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a bookmark
 * DELETE /api/v1/user/bookmarks/:id
 */
async function deleteBookmark(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.validated.params;

    if (!userId) {
      return next(new AppError(401, 'User ID not found in token claims.'));
    }

    // Verify bookmark exists and belongs to user
    const bookmark = await Bookmark.findById(id);

    if (!bookmark) {
      return next(new AppError(404, 'Bookmark not found.'));
    }

    if (String(bookmark.userId) !== userId) {
      return next(new AppError(403, 'You do not have permission to delete this bookmark.'));
    }

    await Bookmark.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      data: {
        message: 'Bookmark deleted successfully.'
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBookmark,
  listBookmarks,
  deleteBookmark
};
