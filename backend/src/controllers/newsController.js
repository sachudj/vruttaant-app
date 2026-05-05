const NewsCard = require('../models/NewsCard');
const { isDatabaseConnected } = require('../config/database');
const { fetchNewsCards } = require('../services/newsIngestionService');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ingestNewsFromUrl(req, res) {
  try {
    const {
      url,
      language = 'en',
      maxItems = 20,
      persist = true
    } = req.body || {};

    if (!url) {
      return res.status(400).json({
        message: 'Request body must include a valid url field.'
      });
    }

    const parsedCards = await fetchNewsCards(url, language, Number(maxItems) || 20);

    let persistedCount = 0;
    let dbStatus = 'skipped';

    if (persist && isDatabaseConnected() && parsedCards.cards.length) {
      const operations = parsedCards.cards.map((card) => ({
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
              rawMetadata: card.rawMetadata,
              scrapedAt: new Date()
            }
          },
          upsert: true
        }
      }));

      const writeResult = await NewsCard.bulkWrite(operations, { ordered: false });
      persistedCount = (writeResult.upsertedCount || 0) + (writeResult.modifiedCount || 0);
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
      dbStatus,
      cardsPreview: parsedCards.cards.slice(0, 5)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'News ingestion failed.',
      error: error.message
    });
  }
}

async function getNewsCards(req, res) {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        message: 'Database is not connected.'
      });
    }

    const {
      language = 'en',
      category,
      page = '1',
      limit = '20'
    } = req.query || {};

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
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
    return res.status(500).json({
      message: 'Unable to fetch news cards.',
      error: error.message
    });
  }
}

module.exports = {
  ingestNewsFromUrl,
  getNewsCards
};
