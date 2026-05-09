const cron = require('node-cron');
const { fetchNewsCards } = require('../services/newsIngestionService');
const NewsCard = require('../models/NewsCard');
const { isDatabaseConnected } = require('../config/database');

const DEFAULT_SOURCES = [
  'https://www.bbc.com/news',
  'https://www.reuters.com/world/',
  'https://www.aljazeera.com/news/'
];

// Languages to sync (start with English for now, can be expanded)
const DEFAULT_LANGUAGES = ['en'];

let cronJob = null;

async function syncSource(url, language) {
  try {
    const parsedCards = await fetchNewsCards(url, language, 20);

    if (!parsedCards.cards.length) {
      return { url, status: 'no_cards_found' };
    }

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

    const deduplicatedCards = parsedCards.cards.filter(
      (c) => !c.titleFingerprint || !existingFingerprints.has(c.titleFingerprint)
    );

    if (!deduplicatedCards.length) {
      return { url, status: 'all_duplicates' };
    }

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
    const persistedCount = (writeResult.upsertedCount || 0) + (writeResult.modifiedCount || 0);

    return { url, status: 'success', persistedCount };
  } catch (error) {
    console.error(`[newsSyncJob] Failed to sync ${url}:`, error.message);
    return { url, status: 'error', error: error.message };
  }
}

async function runSyncCycle() {
  if (!isDatabaseConnected()) {
    console.log('[newsSyncJob] Skipped sync cycle - database not connected.');
    return;
  }

  console.log('[newsSyncJob] Starting background sync cycle...');
  for (const lang of DEFAULT_LANGUAGES) {
    for (const sourceUrl of DEFAULT_SOURCES) {
      const result = await syncSource(sourceUrl, lang);
      if (result.status === 'success') {
        console.log(`[newsSyncJob] Synced ${sourceUrl} (${lang}) - ${result.persistedCount} new stories.`);
      }
    }
  }
  console.log('[newsSyncJob] Background sync cycle completed.');
}

function startNewsSyncJob() {
  // Run every 2 hours
  const schedule = process.env.NEWS_SYNC_CRON_SCHEDULE || '0 */2 * * *';
  
  if (process.env.DISABLE_NEWS_SYNC === 'true') {
    console.log('[newsSyncJob] Background sync is disabled via environment variable.');
    return;
  }

  console.log(`[newsSyncJob] Scheduling background sync with expression: ${schedule}`);
  cronJob = cron.schedule(schedule, () => {
    void runSyncCycle();
  });
}

function stopNewsSyncJob() {
  if (cronJob) {
    console.log('[newsSyncJob] Stopping cron job...');
    cronJob.stop();
    cronJob = null;
  }
}

module.exports = {
  startNewsSyncJob,
  stopNewsSyncJob,
  runSyncCycle // exported for testing
};