const NewsCard = require('../models/NewsCard');
const Bookmark = require('../models/Bookmark');

/**
 * Recommendation engine that blends trending scores with personalization.
 * Scoring factors:
 *   - trendScore: raw Hacker News-style gravity score
 *   - categoryBoost: 2x multiplier if category is in user's preferences
 *   - diversityPenalty: reduces score if we've recently shown this category in the same session
 *   - bookmarkSignal: +0.5 boost if user has bookmarked similar articles in same category
 */

/**
 * Fetch user's recent bookmarks grouped by category.
 * Returns map: { categoryA: count, categoryB: count, ... }
 */
async function getUserCategoryBookmarkCounts(userId, limit = 50) {
  if (!userId) return {};

  try {
    const bookmarks = await Bookmark.find({ userId })
      .populate('newsCardId', 'category')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const counts = {};
    bookmarks.forEach((bm) => {
      if (bm.newsCardId?.category) {
        const cat = bm.newsCardId.category;
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });

    return counts;
  } catch (err) {
    // Non-critical; continue without bookmark signal
    return {};
  }
}

/**
 * Compute recommendation score for a single card.
 *
 * @param {Object} card - NewsCard document
 * @param {Array<string>} userCategories - user's preferred category list
 * @param {Object} recentlyShownCategories - map of { category: count } from this session
 * @param {Object} userBookmarkCounts - map of { category: bookmarkCount }
 * @returns {number} recommendation score (higher = more relevant)
 */
function computeRecommendationScore(
  card,
  userCategories = [],
  recentlyShownCategories = {},
  userBookmarkCounts = {}
) {
  let score = card.trendScore || 0;

  // Category preference boost: 2x multiplier
  const categoryBoost = userCategories.includes(card.category) ? 2.0 : 1.0;
  score *= categoryBoost;

  // Diversity penalty: if we've shown this category recently, reduce score
  // Penalty grows with how many we've already shown: 0.8 per previous card of same category
  const timesShown = recentlyShownCategories[card.category] || 0;
  const diversityPenalty = Math.pow(0.8, timesShown);
  score *= diversityPenalty;

  // Bookmark signal: if user has bookmarked articles in this category, add boost
  const categoryBookmarkCount = userBookmarkCounts[card.category] || 0;
  const bookmarkSignal = Math.min(categoryBookmarkCount * 0.1, 0.5); // cap at +0.5
  score += bookmarkSignal;

  return score;
}

/**
 * Get recommended cards for a user (or anonymous visitor).
 * Blends trending + personalization + diversity + bookmark signals.
 *
 * @param {Object} options
 *   - userId: optional user ID for personalization
 *   - userCategories: array of favorite categories (from user.preferences.categories)
 *   - language: language code (default 'en')
 *   - page: page number (default 1)
 *   - limit: results per page (default 20)
 *   - recentlyShownCategories: map of { category: count } from current session (for diversity)
 * @returns {Promise<{ cards, total, page, limit, totalPages, hasMore }>}
 */
async function getRecommendedCards(options = {}) {
  const {
    userId,
    userCategories = [],
    language = 'en',
    page = 1,
    limit = 20,
    recentlyShownCategories = {}
  } = options;

  // Fetch cards scraped within last 7 days (like trending algorithm)
  const cutoff = new Date(Date.now() - 7 * 24 * 3_600_000);

  const filter = {
    language,
    scrapedAt: { $gte: cutoff }
  };

  // Get recent bookmarks if user is authenticated
  const userBookmarkCounts = userId
    ? await getUserCategoryBookmarkCounts(userId)
    : {};

  // Fetch candidate cards
  const [cards, total] = await Promise.all([
    NewsCard.find(filter)
      .select('_id title summary category trendScore url imageUrl source publishedAt scrapedAt')
      .lean(),
    NewsCard.countDocuments(filter)
  ]);

  // Score and sort all candidates
  const scored = cards.map((card) => ({
    ...card,
    recommendationScore: computeRecommendationScore(
      card,
      userCategories,
      recentlyShownCategories,
      userBookmarkCounts
    )
  }));

  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // Paginate
  const skip = (page - 1) * limit;
  const paginatedCards = scored.slice(skip, skip + limit);

  // Strip scoring metadata from response
  const cleanedCards = paginatedCards.map((c) => {
    const { recommendationScore, ...rest } = c;
    return rest;
  });

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return {
    cards: cleanedCards,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages
  };
}

module.exports = {
  computeRecommendationScore,
  getRecommendedCards,
  getUserCategoryBookmarkCounts
};
