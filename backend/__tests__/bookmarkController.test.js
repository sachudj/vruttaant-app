const {
  createBookmark,
  listBookmarks,
  deleteBookmark
} = require('../src/controllers/bookmarkController');
const Bookmark = require('../src/models/Bookmark');
const { AppError } = require('../src/middleware/errorHandler');

jest.mock('../src/models/Bookmark');

describe('bookmarkController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'user-123' },
      validated: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('createBookmark', () => {
    it('should create bookmark successfully', async () => {
      const payload = {
        title: 'Breaking News',
        url: 'https://example.com/article',
        summary: 'This is a summary',
        category: 'Technology',
        imageUrl: 'https://example.com/image.jpg',
        source: 'Example News',
        language: 'en',
        notes: 'Important article'
      };

      req.validated.body = payload;

      const createdBookmark = {
        _id: 'bookmark-123',
        userId: 'user-123',
        ...payload,
        addedAt: new Date(),
        createdAt: new Date()
      };

      Bookmark.findOne.mockResolvedValue(null);
      Bookmark.create.mockResolvedValue(createdBookmark);

      await createBookmark(req, res, next);

      expect(Bookmark.findOne).toHaveBeenCalledWith({
        userId: 'user-123',
        url: payload.url
      });
      expect(Bookmark.create).toHaveBeenCalledWith({
        userId: 'user-123',
        ...payload,
        addedAt: expect.any(Date)
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          bookmark: expect.objectContaining({
            id: 'bookmark-123',
            title: payload.title,
            url: payload.url
          })
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should prevent duplicate bookmarks', async () => {
      const payload = {
        title: 'Breaking News',
        url: 'https://example.com/article'
      };

      req.validated.body = payload;

      const existingBookmark = { _id: 'bookmark-456', userId: 'user-123', url: payload.url };
      Bookmark.findOne.mockResolvedValue(existingBookmark);

      await createBookmark(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(409);
      expect(error.message).toContain('already bookmarked');
    });

    it('should fail if user ID is missing', async () => {
      req.user = {};

      await createBookmark(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should handle database errors', async () => {
      req.validated.body = {
        title: 'Article',
        url: 'https://example.com/article'
      };

      const dbError = new Error('DB connection failed');
      Bookmark.findOne.mockResolvedValue(null);
      Bookmark.create.mockRejectedValue(dbError);

      await createBookmark(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('listBookmarks', () => {
    it('should list bookmarks with pagination', async () => {
      req.validated.query = {
        page: 1,
        limit: 20,
        category: undefined,
        language: undefined
      };

      const mockBookmarks = [
        {
          _id: 'bookmark-1',
          userId: 'user-123',
          title: 'Article 1',
          url: 'https://example.com/1',
          category: 'Tech',
          language: 'en',
          addedAt: new Date(),
          createdAt: new Date()
        },
        {
          _id: 'bookmark-2',
          userId: 'user-123',
          title: 'Article 2',
          url: 'https://example.com/2',
          category: 'News',
          language: 'en',
          addedAt: new Date(),
          createdAt: new Date()
        }
      ];

      Bookmark.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockBookmarks)
      });

      Bookmark.countDocuments.mockResolvedValue(2);

      await listBookmarks(req, res, next);

      expect(Bookmark.find).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          bookmarks: expect.arrayContaining([
            expect.objectContaining({ id: 'bookmark-1', title: 'Article 1' }),
            expect.objectContaining({ id: 'bookmark-2', title: 'Article 2' })
          ]),
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            pages: 1
          }
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should filter bookmarks by category', async () => {
      req.validated.query = {
        page: 1,
        limit: 20,
        category: 'Technology',
        language: undefined
      };

      Bookmark.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      });

      Bookmark.countDocuments.mockResolvedValue(0);

      await listBookmarks(req, res, next);

      expect(Bookmark.find).toHaveBeenCalledWith({
        userId: 'user-123',
        category: 'Technology'
      });
    });

    it('should filter bookmarks by language', async () => {
      req.validated.query = {
        page: 1,
        limit: 20,
        category: undefined,
        language: 'hi'
      };

      Bookmark.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      });

      Bookmark.countDocuments.mockResolvedValue(0);

      await listBookmarks(req, res, next);

      expect(Bookmark.find).toHaveBeenCalledWith({
        userId: 'user-123',
        language: 'hi'
      });
    });

    it('should handle pagination correctly', async () => {
      req.validated.query = {
        page: 2,
        limit: 10,
        category: undefined,
        language: undefined
      };

      const chainedMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      };

      Bookmark.find.mockReturnValue(chainedMock);
      Bookmark.countDocuments.mockResolvedValue(25);

      await listBookmarks(req, res, next);

      expect(chainedMock.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(chainedMock.limit).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          bookmarks: [],
          pagination: {
            page: 2,
            limit: 10,
            total: 25,
            pages: 3
          }
        }
      });
    });

    it('should fail if user ID is missing', async () => {
      req.user = {};

      await listBookmarks(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should handle database errors', async () => {
      req.validated.query = {
        page: 1,
        limit: 20,
        category: undefined,
        language: undefined
      };

      Bookmark.find.mockImplementation(() => {
        throw new Error('DB connection failed');
      });

      await listBookmarks(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteBookmark', () => {
    it('should delete bookmark successfully', async () => {
      req.validated.params = { id: 'bookmark-123' };

      const bookmarkToDelete = {
        _id: 'bookmark-123',
        userId: 'user-123',
        title: 'Article',
        url: 'https://example.com/article'
      };

      Bookmark.findById.mockResolvedValue(bookmarkToDelete);
      Bookmark.findByIdAndDelete.mockResolvedValue(bookmarkToDelete);

      await deleteBookmark(req, res, next);

      expect(Bookmark.findById).toHaveBeenCalledWith('bookmark-123');
      expect(Bookmark.findByIdAndDelete).toHaveBeenCalledWith('bookmark-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Bookmark deleted successfully.'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail if bookmark not found', async () => {
      req.validated.params = { id: 'nonexistent' };

      Bookmark.findById.mockResolvedValue(null);

      await deleteBookmark(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('not found');
    });

    it('should prevent deletion of bookmarks owned by other users', async () => {
      req.validated.params = { id: 'bookmark-456' };

      const bookmarkByOtherUser = {
        _id: 'bookmark-456',
        userId: 'other-user-id',
        title: 'Article',
        url: 'https://example.com/article'
      };

      Bookmark.findById.mockResolvedValue(bookmarkByOtherUser);

      await deleteBookmark(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('permission');
      expect(Bookmark.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should fail if user ID is missing', async () => {
      req.user = {};
      req.validated.params = { id: 'bookmark-123' };

      await deleteBookmark(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should handle database errors', async () => {
      req.validated.params = { id: 'bookmark-123' };

      const dbError = new Error('DB connection failed');
      Bookmark.findById.mockRejectedValue(dbError);

      await deleteBookmark(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
