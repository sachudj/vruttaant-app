/**
 * Migration 006: Recreate the NewsCard text index with language_override: 'none'
 * to prevent MongoDB from trying to interpret 'language' fields as stem language overrides,
 * which causes inserts to fail with "language override unsupported" for non-English codes.
 */
module.exports = {
  version: 6,
  name: 'fix_news_card_text_index',
  async up() {
    const NewsCard = require('../models/NewsCard');

    const indexName = 'title_text_summary_text_aiSummary_text_source_text';
    try {
      await NewsCard.collection.dropIndex(indexName);
      console.log(`[migration-006] Dropped index ${indexName}`);
    } catch (error) {
      if (error?.codeName !== 'IndexNotFound') {
        console.warn(`[migration-006] Warning dropping index: ${error.message}`);
      }
    }

    await NewsCard.collection.createIndex(
      { title: 'text', summary: 'text', aiSummary: 'text', source: 'text' },
      {
        name: indexName,
        language_override: 'none'
      }
    );

    console.log('[migration-006] Recreated NewsCard text index with language_override: "none".');
  }
};
