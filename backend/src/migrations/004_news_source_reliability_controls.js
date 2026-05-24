/**
 * Migration 004: Initialize reliability and failover control fields on NewsSource.
 */
module.exports = {
  version: 4,
  name: 'news_source_reliability_controls',
  async up() {
    const NewsSource = require('../models/NewsSource');

    await NewsSource.updateMany(
      { priority: { $exists: false } },
      { $set: { priority: 100 } }
    );

    await NewsSource.updateMany(
      { reliabilityScore: { $exists: false } },
      { $set: { reliabilityScore: 0.7 } }
    );

    await NewsSource.updateMany(
      { suspendedUntil: { $exists: false } },
      { $set: { suspendedUntil: null } }
    );

    await NewsSource.updateMany(
      { lastError: { $exists: false } },
      { $set: { lastError: '' } }
    );

    console.log('[migration-004] Initialized source reliability controls.');
  }
};
