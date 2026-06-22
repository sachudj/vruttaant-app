const mongoose = require('mongoose');
const { connectDatabase, isDatabaseConnected } = require('../config/database');
const NewsCard = require('../models/NewsCard');
const { summarizeWithLlm, fetchArticleSummary, isBoilerplateText } = require('../services/newsIngestionService');
const { logAuditEvent } = require('../observability/auditLogger');

function parseLimit(raw) {
  const parsed = Number(raw ?? 50);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 200);
}

function buildMissingMetadataQuery() {
  const hasLlm = Boolean(process.env.LLM_API_KEY);
  if (!hasLlm) {
    return {
      summary: { $in: [null, ''] }
    };
  }
  return {
    $or: [
      { aiSummary: { $in: [null, ''] } },
      { category: { $in: [null, ''] } },
      { summary: { $in: [null, ''] } }
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
  const cards = await NewsCard.find(missingQuery).sort({ createdAt: -1 }).limit(batchLimit).lean();

  const summary = {
    scanned: cards.length,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  for (const card of cards) {
    try {
      let currentSummary = card.summary || '';
      const updatedFields = {};

      if (!currentSummary || isBoilerplateText(currentSummary)) {
        const detailed = await fetchArticleSummary(card.url);
        if (detailed) {
          currentSummary = detailed;
          updatedFields.summary = detailed;
        }
      }

      const llm = await summarizeWithLlm(
        {
          title: card.title,
          summary: currentSummary,
          source: card.source,
          url: card.url
        },
        card.language || 'en'
      );

      const nextSummary = llm.aiSummary || card.aiSummary || '';
      const nextCategory = llm.category || card.category || 'General';

      if (nextSummary !== card.aiSummary) {
        updatedFields.aiSummary = nextSummary;
      }
      if (nextCategory !== card.category) {
        updatedFields.category = nextCategory;
      }

      if (Object.keys(updatedFields).length === 0) {
        summary.skipped += 1;
        continue;
      }

      await NewsCard.updateOne(
        { _id: card._id },
        { $set: updatedFields }
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
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors
    }
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
