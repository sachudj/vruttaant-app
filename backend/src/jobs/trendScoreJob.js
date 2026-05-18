const cron = require('node-cron');
const NewsCard = require('../models/NewsCard');
const { isDatabaseConnected } = require('../config/database');

/**
 * Hacker News-style gravity formula:
 *   score = ingestCount / (hoursOld + 2)^1.5
 *
 * Stories gain score as they're seen more often across sources,
 * then decay as they age. The +2 offset prevents division-by-zero
 * and dampens the explosive initial score for brand-new cards.
 */
function computeTrendScore(ingestCount, scrapedAt) {
  const hoursOld = (Date.now() - new Date(scrapedAt).getTime()) / 3_600_000;
  return (ingestCount || 1) / Math.pow(hoursOld + 2, 1.5);
}

async function runTrendScoreUpdate() {
  if (!isDatabaseConnected()) {
    return;
  }

  // Only recompute cards scraped within the last 7 days;
  // older cards decay to near-zero and aren't worth frequent updates.
  const cutoff = new Date(Date.now() - 7 * 24 * 3_600_000);

  const cards = await NewsCard.find(
    { scrapedAt: { $gte: cutoff } },
    { _id: 1, ingestCount: 1, scrapedAt: 1 }
  ).lean();

  if (!cards.length) return;

  const operations = cards.map((card) => ({
    updateOne: {
      filter: { _id: card._id },
      update: { $set: { trendScore: computeTrendScore(card.ingestCount, card.scrapedAt) } }
    }
  }));

  await NewsCard.bulkWrite(operations, { ordered: false });
  console.log(`[trendScoreJob] Updated trend scores for ${cards.length} cards.`);
}

let cronJob = null;

function startTrendScoreJob() {
  const schedule = process.env.TREND_SCORE_CRON_SCHEDULE || '0 * * * *'; // every hour on the hour

  if (process.env.DISABLE_TREND_SCORE === 'true') {
    console.log('[trendScoreJob] Trend score job disabled via environment variable.');
    return;
  }

  console.log(`[trendScoreJob] Scheduling trend score updates: ${schedule}`);
  cronJob = cron.schedule(schedule, () => {
    void runTrendScoreUpdate();
  });
}

function stopTrendScoreJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[trendScoreJob] Stopped.');
  }
}

module.exports = { startTrendScoreJob, stopTrendScoreJob, runTrendScoreUpdate, computeTrendScore };
