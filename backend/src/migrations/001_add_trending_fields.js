/**
 * Migration 001: Add trendScore and ingestCount to NewsCard documents.
 * trendScore is computed hourly by trendScoreJob.
 * ingestCount tracks how many sync cycles have seen this story.
 */
module.exports = {
  version: 1,
  name: 'add_trending_fields_to_newscards',
  async up() {
    // Lazy require to avoid circular dependency during runner setup
    const NewsCard = require('../models/NewsCard');
    await NewsCard.updateMany(
      { trendScore: { $exists: false } },
      { $set: { trendScore: 0, ingestCount: 1 } }
    );
  }
};
