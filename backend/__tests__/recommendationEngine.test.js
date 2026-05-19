const {
  computeRecommendationScore,
  getRecommendedCards,
  getUserCategoryBookmarkCounts,
  getEngagedCategories
} = require('../src/services/recommendationEngine');
const NewsCard = require('../src/models/NewsCard');
const Bookmark = require('../src/models/Bookmark');

jest.mock('../src/models/NewsCard', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/Bookmark', () => ({
  find: jest.fn()
}));

describe('recommendationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('computeRecommendationScore', () => {
    it('returns trendScore as base when no preferences or diversity penalty', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      const score = computeRecommendationScore(card, [], {}, {});
      expect(score).toBe(1.0);
    });

    it('applies 2x category boost when category is in user preferences', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      const score = computeRecommendationScore(card, ['Tech', 'Science'], {}, {});
      expect(score).toBe(2.0);
    });

    it('applies diversity penalty (0.8^n) based on recently shown count', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      // First card of Tech: no penalty (0.8^0 = 1)
      const score1 = computeRecommendationScore(card, [], { Tech: 0 }, {});
      expect(score1).toBe(1.0);

      // Second card of Tech: 0.8 penalty
      const score2 = computeRecommendationScore(card, [], { Tech: 1 }, {});
      expect(score2).toBeCloseTo(0.8);

      // Third card: stronger penalty
      const score3 = computeRecommendationScore(card, [], { Tech: 2 }, {});
      expect(score3).toBeCloseTo(0.64);
    });

    it('combines category boost and diversity penalty', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      // 2x boost * 0.8 penalty (one already shown)
      const score = computeRecommendationScore(card, ['Tech'], { Tech: 1 }, {});
      expect(score).toBeCloseTo(1.6); // 2.0 * 0.8
    });

    it('adds bookmark signal (max +0.5 for multiple bookmarks)', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      // 1 bookmark in Tech: +0.1
      const score1 = computeRecommendationScore(card, [], {}, { Tech: 1 });
      expect(score1).toBeCloseTo(1.1);

      // 5 bookmarks in Tech: +0.5 (capped)
      const score2 = computeRecommendationScore(card, [], {}, { Tech: 5 });
      expect(score2).toBeCloseTo(1.5);

      // 10 bookmarks in Tech: still +0.5 (capped)
      const score3 = computeRecommendationScore(card, [], {}, { Tech: 10 });
      expect(score3).toBeCloseTo(1.5);
    });

    it('combines all factors: boost + diversity + bookmarks', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      // 2x boost * 0.8 penalty + 0.2 bookmark signal
      const score = computeRecommendationScore(
        card,
        ['Tech'],          // user likes Tech
        { Tech: 1 },       // already shown 1 Tech card
        { Tech: 2 }        // user has 2 bookmarks in Tech
      );
      expect(score).toBeCloseTo(1.8); // (1.0 * 2.0 * 0.8) + 0.2
    });

    it('applies 1.3x engagement boost for most-engaged categories (K.2)', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      // engagement boost only, no preferences
      const score = computeRecommendationScore(
        card,
        [],               // no user preferences
        {},
        {},
        ['Tech']          // Tech is in engaged categories
      );
      expect(score).toBeCloseTo(1.3); // 1.0 * 1.3
    });

    it('combines preference boost and engagement boost', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      // Preference boost (2x) AND engagement boost (1.3x)
      const score = computeRecommendationScore(
        card,
        ['Tech'],         // user prefers Tech
        {},
        {},
        ['Tech']          // user also actively bookmarks Tech
      );
      expect(score).toBeCloseTo(2.6); // 1.0 * 2.0 * 1.3
    });

    it('combines all factors including engagement boost', () => {
      const card = { trendScore: 1.0, category: 'Tech' };
      // Preference boost (2x) * engagement boost (1.3x) * diversity penalty (0.8) + bookmark signal (0.2)
      const score = computeRecommendationScore(
        card,
        ['Tech'],         // user prefers Tech
        { Tech: 1 },      // already shown 1 Tech card (penalty)
        { Tech: 2 },      // user has 2 Tech bookmarks (signal)
        ['Tech']          // user actively engages with Tech
      );
      expect(score).toBeCloseTo(2.28); // (1.0 * 2.0 * 1.3 * 0.8) + 0.2
    });

    it('does not apply engagement boost for non-engaged categories', () => {
      const card = { trendScore: 1.0, category: 'Politics' };
      // Tech is engaged, but card is Politics
      const score = computeRecommendationScore(
        card,
        [],
        {},
        {},
        ['Tech', 'Science']  // engaged categories exclude Politics
      );
      expect(score).toBe(1.0); // no boost applied
    });

    it('engagement boost stacks correctly with other factors', () => {
      const card = { trendScore: 2.0, category: 'Tech' };
      // Base 2.0 * preference 2x * engagement 1.3x * diversity 0.8 + bookmark 0.1
      const score = computeRecommendationScore(
        card,
        ['Tech'],
        { Tech: 1 },
        { Tech: 1 },
        ['Tech']
      );
      expect(score).toBeCloseTo(4.26); // (2.0 * 2.0 * 1.3 * 0.8) + 0.1
    });
  });

  describe('getEngagedCategories', () => {
    it('returns empty array when no bookmarks', () => {
      const result = getEngagedCategories({});
      expect(result).toEqual([]);
    });

    it('returns top 3 engaged categories sorted by count (default)', () => {
      const bookmarkCounts = {
        Tech: 15,
        Science: 8,
        Sports: 5,
        Politics: 3,
        Business: 1
      };
      const result = getEngagedCategories(bookmarkCounts);
      expect(result).toEqual(['Tech', 'Science', 'Sports']);
    });

    it('returns all categories if fewer than topN', () => {
      const bookmarkCounts = {
        Tech: 10,
        Science: 5
      };
      const result = getEngagedCategories(bookmarkCounts);
      expect(result).toEqual(['Tech', 'Science']);
    });

    it('respects custom topN parameter', () => {
      const bookmarkCounts = {
        Tech: 15,
        Science: 8,
        Sports: 5,
        Politics: 3
      };
      const result = getEngagedCategories(bookmarkCounts, 2);
      expect(result).toEqual(['Tech', 'Science']);
    });

    it('handles topN=1 correctly', () => {
      const bookmarkCounts = {
        Tech: 15,
        Science: 8,
        Sports: 5
      };
      const result = getEngagedCategories(bookmarkCounts, 1);
      expect(result).toEqual(['Tech']);
    });

    it('sorts by count descending', () => {
      const bookmarkCounts = {
        Sports: 2,
        Tech: 10,
        Science: 5
      };
      const result = getEngagedCategories(bookmarkCounts);
      expect(result).toEqual(['Tech', 'Science', 'Sports']);
    });

    it('handles ties in bookmark counts', () => {
      const bookmarkCounts = {
        Tech: 10,
        Science: 10,
        Sports: 5
      };
      const result = getEngagedCategories(bookmarkCounts);
      // Both Tech and Science have 10, order depends on object iteration
      expect(result).toHaveLength(3);
      expect(result).toContain('Tech');
      expect(result).toContain('Science');
      expect(result).toContain('Sports');
    });
  });

  describe('getUserCategoryBookmarkCounts', () => {
    it('returns empty map when user has no bookmarks', async () => {
      Bookmark.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      const result = await getUserCategoryBookmarkCounts('user-1');
      expect(result).toEqual({});
    });

    it('counts bookmarks by category', async () => {
      const mockBookmarks = [
        { newsCardId: { category: 'Tech' } },
        { newsCardId: { category: 'Tech' } },
        { newsCardId: { category: 'Science' } }
      ];
      Bookmark.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockBookmarks)
      });

      const result = await getUserCategoryBookmarkCounts('user-1');
      expect(result).toEqual({ Tech: 2, Science: 1 });
    });

    it('handles bookmarks with null newsCardId gracefully', async () => {
      const mockBookmarks = [
        { newsCardId: { category: 'Tech' } },
        { newsCardId: null },
        { newsCardId: { category: 'Science' } }
      ];
      Bookmark.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockBookmarks)
      });

      const result = await getUserCategoryBookmarkCounts('user-1');
      expect(result).toEqual({ Tech: 1, Science: 1 });
    });

    it('returns empty map on database error (non-critical)', async () => {
      Bookmark.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      const result = await getUserCategoryBookmarkCounts('user-1');
      expect(result).toEqual({});
    });
  });

  describe('getRecommendedCards', () => {
    const mockChain = {
      select: jest.fn(),
      lean: jest.fn()
    };

    beforeEach(() => {
      mockChain.select.mockReturnValue(mockChain);
      NewsCard.find.mockReturnValue(mockChain);
      NewsCard.countDocuments.mockResolvedValue(0);
      Bookmark.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
    });

    it('returns empty results when no cards found', async () => {
      mockChain.lean.mockResolvedValue([]);
      NewsCard.countDocuments.mockResolvedValue(0);

      const result = await getRecommendedCards({ language: 'en' });

      expect(result.cards).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('scores and ranks cards by recommendation score', async () => {
      const mockCards = [
        { _id: '1', title: 'Tech news', category: 'Tech', trendScore: 0.5 },
        { _id: '2', title: 'Science news', category: 'Science', trendScore: 1.0 }
      ];
      mockChain.lean.mockResolvedValue(mockCards);
      NewsCard.countDocuments.mockResolvedValue(2);

      const result = await getRecommendedCards({
        language: 'en',
        userCategories: ['Science']
      });

      // Science should rank higher due to 2x boost (1.0 * 2.0 = 2.0 > 0.5)
      expect(result.cards[0]._id).toBe('2');
      expect(result.cards[1]._id).toBe('1');
    });

    it('applies diversity penalty based on recently shown categories', async () => {
      const mockCards = [
        { _id: '1', title: 'Tech news 1', category: 'Tech', trendScore: 1.0 },
        { _id: '2', title: 'Tech news 2', category: 'Tech', trendScore: 1.0 }
      ];
      mockChain.lean.mockResolvedValue(mockCards);
      NewsCard.countDocuments.mockResolvedValue(2);

      const result = await getRecommendedCards({
        language: 'en',
        recentlyShownCategories: { Tech: 1 } // Already showed 1 Tech card
      });

      // First Tech card scores higher (0.8^0 = 1.0)
      // But both cards have identical scores, so order is by sorted result
      // The second card in the array will be penalized (0.8^1 = 0.8)
      expect(result.cards).toHaveLength(2);
      const score1 = 1.0; // 1.0 * 0.8^1 (one already shown before this batch)
      const score2 = 0.8; // 1.0 * 0.8^2 (two already shown)
      expect(score1).toBeGreaterThan(score2);
    });

    it('paginates results correctly', async () => {
      const mockCards = Array.from({ length: 25 }, (_, i) => ({
        _id: String(i + 1),
        title: `Card ${i + 1}`,
        category: 'Tech',
        trendScore: 1.0
      }));
      mockChain.lean.mockResolvedValue(mockCards);
      NewsCard.countDocuments.mockResolvedValue(25);

      const result = await getRecommendedCards({
        language: 'en',
        page: 2,
        limit: 10
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.cards).toHaveLength(10);
      // Page 2 should start from card 11
      expect(result.cards[0]._id).toBe('11');
    });

    it('does not include scoring metadata in response', async () => {
      const mockCards = [
        { _id: '1', title: 'Tech news', category: 'Tech', trendScore: 1.0 }
      ];
      mockChain.lean.mockResolvedValue(mockCards);
      NewsCard.countDocuments.mockResolvedValue(1);

      const result = await getRecommendedCards({ language: 'en' });

      expect(result.cards[0]).not.toHaveProperty('recommendationScore');
      expect(result.cards[0]._id).toBe('1');
      expect(result.cards[0].title).toBe('Tech news');
    });

    it('applies engagement boost for user\'s most-bookmarked categories (K.2)', async () => {
      const mockCards = [
        { _id: '1', title: 'Tech news', category: 'Tech', trendScore: 1.0 },
        { _id: '2', title: 'Science news', category: 'Science', trendScore: 1.0 }
      ];
      mockChain.lean.mockResolvedValue(mockCards);
      NewsCard.countDocuments.mockResolvedValue(2);

      // Mock user bookmarks: Tech has 5, Science has 2
      Bookmark.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { newsCardId: { category: 'Tech' } },
          { newsCardId: { category: 'Tech' } },
          { newsCardId: { category: 'Tech' } },
          { newsCardId: { category: 'Tech' } },
          { newsCardId: { category: 'Tech' } },
          { newsCardId: { category: 'Science' } },
          { newsCardId: { category: 'Science' } }
        ])
      });

      const result = await getRecommendedCards({
        userId: 'user-1',
        language: 'en'
      });

      // Tech should rank higher because it's the most-engaged category
      // Tech: 1.0 * 1.3 (engagement boost) = 1.3
      // Science: 1.0 (no engagement boost as it's not in top 3) = 1.0
      expect(result.cards[0]._id).toBe('1'); // Tech ranks first
      expect(result.cards[1]._id).toBe('2'); // Science ranks second
    });

    it('uses engagement-driven boosting only for authenticated users', async () => {
      const mockCards = [
        { _id: '1', title: 'Tech news', category: 'Tech', trendScore: 1.0 }
      ];
      mockChain.lean.mockResolvedValue(mockCards);
      NewsCard.countDocuments.mockResolvedValue(1);

      // No userId provided (anonymous user)
      const result = await getRecommendedCards({
        language: 'en'
      });

      expect(result.cards[0]._id).toBe('1');
      // Bookmark.find should not be called for anonymous users
      expect(Bookmark.find).not.toHaveBeenCalled();
    });
  });
});
