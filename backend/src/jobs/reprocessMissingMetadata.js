const mongoose = require('mongoose');
const cheerio = require('cheerio');
const { connectDatabase, isDatabaseConnected } = require('../config/database');
const NewsCard = require('../models/NewsCard');
const {
  summarizeWithLlm,
  fetchArticleDetails,
  isBoilerplateText,
  isGenericOrLogoImage,
  getSourceNameFromUrl
} = require('../services/newsIngestionService');
const { logAuditEvent } = require('../observability/auditLogger');

function parseLimit(raw) {
  const parsed = Number(raw ?? 50);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 200);
}

async function findCorrectArticleUrl(indexUrl, title) {
  try {
    const response = await fetch(indexUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi-IN;q=0.8',
      },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const normalizedTitle = title.trim().toLowerCase();
    let foundUrl = null;
    
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().toLowerCase();
      if (href && text && text.length > 15) {
        if (normalizedTitle.includes(text) || text.includes(normalizedTitle)) {
          try {
            const resolved = new URL(href, indexUrl).toString();
            const nonArticlePatterns = [
              /\/category\//i,
              /\/section\//i,
              /\/tag\//i,
              /\/author\//i,
              /\/topic\//i
            ];
            const isArticle = !nonArticlePatterns.some((pattern) => pattern.test(resolved));
            if (isArticle) {
              foundUrl = resolved;
              return false; // break loop
            }
          } catch {
            // ignore
          }
        }
      }
    });
    return foundUrl;
  } catch (err) {
    return null;
  }
}

function buildMissingMetadataQuery() {
  const hasLlm = Boolean(process.env.LLM_API_KEY);
  const baseMissing = {
    $or: [
      { title: { $regex: /^.{80,}$/ } },
      { summary: { $in: [null, ''] } },
      { summary: { $regex: /^.{0,100}$/ } },
      { imageUrl: { $in: [null, ''] } },
      { imageUrl: /logo|placeholder|default-ie/i },
      { source: { $in: [null, '', 'Unknown Source'] } },
      { url: /\/(section|category|author)\//i }
    ]
  };

  if (!hasLlm) {
    return baseMissing;
  }
  return {
    $or: [
      ...baseMissing.$or,
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

  const missingQuery = options.query || buildMissingMetadataQuery();
  const cards = await NewsCard.find(missingQuery).sort({ createdAt: -1 }).limit(batchLimit).lean();

  const summary = {
    scanned: cards.length,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  for (const card of cards) {
    try {
      let currentUrl = card.url || '';
      let currentSummary = card.summary || '';
      let currentImageUrl = card.imageUrl || '';
      let currentSource = card.source || '';
      const updatedFields = {};

      const nonArticlePatterns = [
        /\/category\//i,
        /\/section\//i,
        /\/author\//i,
        /\/topic\//i
      ];
      const isIndexUrl = nonArticlePatterns.some((pattern) => pattern.test(currentUrl));
      if (isIndexUrl) {
        const correctUrl = await findCorrectArticleUrl(currentUrl, card.title);
        if (correctUrl && correctUrl !== currentUrl) {
          currentUrl = correctUrl;
          updatedFields.url = correctUrl;
        }
      }

      const cleanSource = getSourceNameFromUrl(currentUrl, currentSource === 'Unknown Source' ? '' : currentSource);
      if (cleanSource && cleanSource !== currentSource) {
        currentSource = cleanSource;
        updatedFields.source = cleanSource;
      }

      const needsTitle = !card.title || card.title.length > 80;
      const needsSummary = !currentSummary || currentSummary.split(/\s+/).filter(Boolean).length < 20 || isBoilerplateText(currentSummary);
      const needsImage = !currentImageUrl || isGenericOrLogoImage(currentImageUrl);

      if (needsSummary || needsImage || needsTitle || updatedFields.url) {
        const details = await fetchArticleDetails(currentUrl, card.title);
        
        if (needsTitle && details.title && details.title.length < card.title.length) {
          updatedFields.title = details.title;
        }
        if ((needsSummary || updatedFields.url) && details.summary) {
          currentSummary = details.summary;
          updatedFields.summary = details.summary;
        }
        if ((needsImage || updatedFields.url) && details.imageUrl) {
          currentImageUrl = details.imageUrl;
          updatedFields.imageUrl = details.imageUrl;
        }
      }

      const llm = await summarizeWithLlm(
        {
          title: card.title,
          summary: currentSummary,
          source: currentSource,
          url: currentUrl
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
