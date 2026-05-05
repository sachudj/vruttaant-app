const NewsCard = require('../models/NewsCard');
const { isDatabaseConnected } = require('../config/database');
const { fetchNewsCards } = require('../services/newsIngestionService');

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

module.exports = {
  ingestNewsFromUrl
};
