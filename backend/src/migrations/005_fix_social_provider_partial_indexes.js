/**
 * Migration 005: Replace legacy social-provider unique indexes with
 * partial unique indexes that only apply to string values.
 */
module.exports = {
  version: 5,
  name: 'fix_social_provider_partial_indexes',
  async up() {
    const User = require('../models/User');

    const dropIfExists = async (indexName) => {
      try {
        await User.collection.dropIndex(indexName);
        console.log(`[migration-005] Dropped index ${indexName}`);
      } catch (error) {
        if (error?.codeName !== 'IndexNotFound') {
          throw error;
        }
      }
    };

    await dropIfExists('authProviders.googleSub_1');
    await dropIfExists('authProviders.appleSub_1');

    await User.collection.createIndex(
      { 'authProviders.googleSub': 1 },
      {
        unique: true,
        partialFilterExpression: { 'authProviders.googleSub': { $type: 'string' } }
      }
    );

    await User.collection.createIndex(
      { 'authProviders.appleSub': 1 },
      {
        unique: true,
        partialFilterExpression: { 'authProviders.appleSub': { $type: 'string' } }
      }
    );

    console.log('[migration-005] Ensured partial unique social provider indexes.');
  }
};
