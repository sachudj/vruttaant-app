const NewsCard = require('../models/NewsCard');
const { isDatabaseConnected } = require('../config/database');
const { fetchNewsCards } = require('../services/newsIngestionService');
const { AppError } = require('../middleware/errorHandler');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ingestNewsFromUrl(req, res, next) {
  try {
    const {
      url,
      language = 'en',
      maxItems = 20,
      persist = true
    } = req.validated?.body || req.body || {};

    const parsedCards = await fetchNewsCards(url, language, Number(maxItems) || 20);

    let persistedCount = 0;
    let dedupSkippedCount = 0;
    let dbStatus = 'skipped';

    if (persist && isDatabaseConnected() && parsedCards.cards.length) {
      // E3: Cross-source duplicate detection.
      // Cards with the same titleFingerprint + language already in the DB are
      // considered duplicates of stories we already have (possibly from another
      // source URL). Fetch existing fingerprints for this language in one query,
      // then filter before bulk-write so we only upsert genuinely new stories.
      const incomingFingerprints = parsedCards.cards
        .map((c) => c.titleFingerprint)
        .filter(Boolean);

      let existingFingerprints = new Set();
      if (incomingFingerprints.length) {
        const existing = await NewsCard.find(
          { titleFingerprint: { $in: incomingFingerprints }, language: parsedCards.language },
          { titleFingerprint: 1, _id: 0 }
        ).lean();
        existingFingerprints = new Set(existing.map((d) => d.titleFingerprint));
      }

      // Keep cards whose URL is new OR whose fingerprint is not already stored.
      // URL-level upsert already handles same-URL re-ingestion; fingerprint check
      // prevents cross-source story duplication.
      const deduplicatedCards = parsedCards.cards.filter(
        (c) => !c.titleFingerprint || !existingFingerprints.has(c.titleFingerprint)
      );

      const operations = deduplicatedCards.map((card) => ({
        updateOne: {
          filter: { url: card.url, language: card.language },
          update: {
            $set: {
              title: card.title,
              summary: card.summary,
              aiSummary: card.aiSummary,
              category: card.category,
              imageUrl: card.imageUrl,
              source: card.source,
              publishedAt: card.publishedAt,
              titleFingerprint: card.titleFingerprint || '',
              rawMetadata: card.rawMetadata,
              scrapedAt: new Date()
            }
          },
          upsert: true
        }
      }));

      const writeResult = await NewsCard.bulkWrite(operations, { ordered: false });
      persistedCount = (writeResult.upsertedCount || 0) + (writeResult.modifiedCount || 0);
      dedupSkippedCount = parsedCards.cards.length - deduplicatedCards.length;
      dbStatus = 'saved';
    } else if (persist && !isDatabaseConnected()) {
      dbStatus = 'not-connected';
    }

    return res.status(200).json({
      message: 'News ingestion completed.',
      sourceUrl: parsedCards.sourceUrl,
      language: parsedCards.language,
      scrapedCount: parsedCards.totalFound,
      persistedCount,
      dedupSkippedCount,
      dbStatus,
      cardsPreview: parsedCards.cards.slice(0, 5)
    });
  } catch (error) {
    return next(error);
  }
}

async function getNewsCards(req, res, next) {
  try {
    if (!isDatabaseConnected()) {
      throw new AppError(503, 'Database is not connected.');
    }

    const {
      language = 'en',
      category,
      page = 1,
      limit = 20
    } = req.validated?.query || req.query || {};

    const parsedPage = page;
    const parsedLimit = limit;
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {
      language: String(language || 'en').trim().toLowerCase()
    };

    if (category) {
      const normalizedCategory = String(category).trim();
      if (normalizedCategory) {
        filter.category = {
          $regex: `^${escapeRegex(normalizedCategory)}$`,
          $options: 'i'
        };
      }
    }

    const [items, total] = await Promise.all([
      NewsCard.find(filter)
        .sort({ scrapedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      NewsCard.countDocuments(filter)
    ]);

    const totalPages = Math.max(Math.ceil(total / parsedLimit), 1);

    return res.status(200).json({
      message: 'News cards fetched successfully.',
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
      hasMore: parsedPage < totalPages,
      filters: {
        language: filter.language,
        category: category ? String(category).trim() : null
      },
      cards: items
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  ingestNewsFromUrl,
  getNewsCards
};
