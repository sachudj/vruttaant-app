const cron = require('node-cron');
const { fetchNewsCards } = require('../services/newsIngestionService');
const NewsCard = require('../models/NewsCard');
const NewsSource = require('../models/NewsSource');
const { isDatabaseConnected } = require('../config/database');

const SOURCE_FAIL_THRESHOLD = Number(process.env.NEWS_SOURCE_FAIL_THRESHOLD || 3);
const SOURCE_RETRY_COOLDOWN_MINUTES = Number(process.env.NEWS_SOURCE_RETRY_COOLDOWN_MINUTES || 120);
const RELIABILITY_DECAY_STEP = Number(process.env.NEWS_SOURCE_RELIABILITY_DECAY_STEP || 0.1);
const RELIABILITY_RECOVERY_STEP = Number(process.env.NEWS_SOURCE_RELIABILITY_RECOVERY_STEP || 0.03);

// Fallback sources used when the DB has no sources configured yet.
const FALLBACK_SOURCES = [
  {
    url: 'https://www.bbc.com/news',
    language: 'en',
    maxItems: 20,
    name: 'BBC News',
    priority: 100,
    reliabilityScore: 0.7
  },
  {
    url: 'https://www.reuters.com/world/',
    language: 'en',
    maxItems: 20,
    name: 'Reuters',
    priority: 100,
    reliabilityScore: 0.7
  },
  {
    url: 'https://www.aljazeera.com/news/',
    language: 'en',
    maxItems: 20,
    name: 'Al Jazeera',
    priority: 100,
    reliabilityScore: 0.7
  }
];

async function loadSources() {
  try {
    const now = new Date();
    const dbSources = await NewsSource.find({
      enabled: true,
      $or: [{ suspendedUntil: null }, { suspendedUntil: { $lte: now } }]
    })
      .sort({ priority: 1, reliabilityScore: -1, failCount: 1, name: 1 })
      .lean();
    if (dbSources.length) return dbSources;
  } catch (err) {
    console.warn('[newsSyncJob] Failed to load sources from DB, using fallback.', err.message);
  }
  return FALLBACK_SOURCES;
}

let cronJob = null;

async function syncSource(url, language, maxItems = 20) {
  try {
    const parsedCards = await fetchNewsCards(url, language, maxItems);

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
          },
          $inc: { ingestCount: 1 }
        },
        upsert: true
      }
    }));

    const writeResult = await NewsCard.bulkWrite(operations, { ordered: false });
    const persistedCount = (writeResult.upsertedCount || 0) + (writeResult.modifiedCount || 0);

    // Update source health on success.
    const source = await NewsSource.findOne({ url }).lean();
    if (source) {
      const currentReliability = Number(source.reliabilityScore ?? 0.7);
      const nextReliability = Math.min(1, currentReliability + RELIABILITY_RECOVERY_STEP);

      await NewsSource.findOneAndUpdate(
        { url },
        {
          $set: {
            lastSyncedAt: new Date(),
            failCount: 0,
            suspendedUntil: null,
            reliabilityScore: nextReliability,
            lastError: ''
          }
        }
      ).catch(() => {}); // non-critical
    }

    return { url, status: 'success', persistedCount };
  } catch (error) {
    console.error(`[newsSyncJob] Failed to sync ${url}:`, error.message);

    // Track failures and temporarily suspend noisy sources.
    const source = await NewsSource.findOne({ url }).lean().catch(() => null);
    if (source) {
      const nextFailCount = Number(source.failCount || 0) + 1;
      const currentReliability = Number(source.reliabilityScore ?? 0.7);
      const nextReliability = Math.max(0, currentReliability - RELIABILITY_DECAY_STEP);
      const shouldSuspend = nextFailCount >= SOURCE_FAIL_THRESHOLD;
      const suspendedUntil = shouldSuspend
        ? new Date(Date.now() + SOURCE_RETRY_COOLDOWN_MINUTES * 60 * 1000)
        : null;

      await NewsSource.findOneAndUpdate(
        { url },
        {
          $set: {
            failCount: shouldSuspend ? 0 : nextFailCount,
            reliabilityScore: nextReliability,
            suspendedUntil,
            lastError: String(error.message || '').slice(0, 300)
          }
        }
      ).catch(() => {}); // non-critical
    }

    return { url, status: 'error', error: error.message };
  }
}

async function runSyncCycle() {
  if (!isDatabaseConnected()) {
    console.log('[newsSyncJob] Skipped sync cycle - database not connected.');
    return;
  }

  console.log('[newsSyncJob] Starting background sync cycle...');

  const sources = await loadSources();
  for (const source of sources) {
    const result = await syncSource(source.url, source.language, source.maxItems);
    if (result.status === 'success') {
      console.log(
        `[newsSyncJob] Synced ${source.url} (${source.language}) - ${result.persistedCount} stories.`
      );
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