const SchemaVersion = require('../models/SchemaVersion');

/**
 * Ordered list of all migrations.
 * Each migration must have: version (int), name (string), up() async function.
 */
const migrations = [
  require('./001_add_trending_fields'),
  require('./002_seed_news_sources')
];

/**
 * Runs all pending migrations in order.
 * Reads current schema version from DB, applies any with version > current.
 */
async function runMigrations() {
  const versionDoc = await SchemaVersion.findOne().lean();
  const currentVersion = versionDoc ? versionDoc.version : 0;

  const pending = migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (!pending.length) {
    console.log(`[migrations] Schema is up to date at version ${currentVersion}.`);
    return;
  }

  for (const migration of pending) {
    console.log(`[migrations] Applying migration v${migration.version}: ${migration.name}`);
    await migration.up();
    await SchemaVersion.findOneAndUpdate(
      {},
      {
        version: migration.version,
        description: migration.name,
        appliedAt: new Date()
      },
      { upsert: true, new: true }
    );
    console.log(`[migrations] Migration v${migration.version} applied successfully.`);
  }
}

module.exports = { runMigrations };
