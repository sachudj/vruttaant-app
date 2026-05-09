const { connectDatabase, isDatabaseConnected } = require('../config/database');
const NewsCard = require('../models/NewsCard');
const { summarizeWithLlm } = require('../services/newsIngestionService');
const { logAuditEvent } = require('../observability/auditLogger');

function parseLimit(raw) {
  const parsed = Number(raw ?? 50);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 200);
}

function buildMissingMetadataQuery() {
  return {
    $or: [
      { aiSummary: { $in: [null, ''] } },
      { category: { $in: [null, ''] } }
    ]
  };
}

async function reprocessMissingMetadata(options = {}) {
  const batchLimit = parseLimit(options.batchLimit || process.env.REPROCESS_BATCH_LIMIT);

  const connected = await connectDatabase();
  if (!connected || !isDatabaseConnected()) {
    throw new Error('Database is not connected. Cannot run reprocessing job.');
  }

  const missingQuery = buildMissingMetadataQuery();
  const cards = await NewsCard.find(missingQuery).sort({ createdAt: 1 }).limit(batchLimit).lean();

  const summary = {
    scanned: cards.length,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  for (const card of cards) {
    try {
      const llm = await summarizeWithLlm(
        {
          title: card.title,
          summary: card.summary,
          source: card.source,
          url: card.url
        },
        card.language || 'en'
      );

      const nextSummary = llm.aiSummary || card.aiSummary || '';
      const nextCategory = llm.category || card.category || 'General';

      if (!nextSummary && !nextCategory) {
        summary.skipped += 1;
        continue;
      }

      await NewsCard.updateOne(
        { _id: card._id },
        {
          $set: {
            aiSummary: nextSummary,
            category: nextCategory
          }
        }
      );

      summary.updated += 1;
    } catch (error) {
      summary.failed += 1;
      logAuditEvent('news_card_reprocess_failed', {
        cardId: String(card._id),
        url: card.url || '',
        language: card.language || 'en',
        error: error?.message || 'Unknown error'
      });
    }
  }

  return summary;
}

async function run() {
  try {
    const result = await reprocessMissingMetadata();
    console.log(`Reprocess complete: scanned=${result.scanned}, updated=${result.updated}, skipped=${result.skipped}, failed=${result.failed}`);
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  parseLimit,
  buildMissingMetadataQuery,
  reprocessMissingMetadata
};
