const cron = require('node-cron');
const User = require('../models/User');
const NewsCard = require('../models/NewsCard');
const NotificationDevice = require('../models/NotificationDevice');
const pushNotificationService = require('../services/pushNotificationService');
const logger = require('../observability/logger');

/**
 * Job to send Daily Digest to users who have opted in.
 */
async function sendDailyDigest() {
  const jobId = `digest_${Date.now()}`;
  logger.info({ jobId }, 'Starting daily digest job');

  try {
    // 1. Fetch top 3 latest cards from the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const latestCards = await NewsCard.find({ publishedAt: { $gte: yesterday } })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    if (latestCards.length === 0) {
      logger.info({ jobId }, 'No new cards in the last 24 hours, skipping digest');
      return;
    }

    const digestTitle = 'Your Daily Vruttaant Digest';
    const digestBody = `Catch up on today's top stories: ${latestCards[0].title} and more.`;
    const payloadData = {
      type: 'daily_digest',
      cardId: String(latestCards[0]._id)
    };

    // 2. Find users who have dailyDigest enabled
    // Note: user.preferences.notifications.dailyDigest
    const usersCursor = User.find({
      'preferences.notifications.dailyDigest': true
    })
      .select('_id')
      .cursor();

    let usersProcessed = 0;
    let tokensPushed = 0;

    // Process users in chunks/cursor to avoid memory bloat
    for await (const user of usersCursor) {
      usersProcessed++;

      // Find active devices for this user
      const devices = await NotificationDevice.find({
        userId: user._id,
        enabled: true
      }).lean();

      const tokens = devices.map(d => d.token);
      if (tokens.length > 0) {
        // Send multicast to all user's devices
        const response = await pushNotificationService.sendMulticast(
          tokens,
          digestTitle,
          digestBody,
          payloadData
        );

        tokensPushed += tokens.length;
        
        // Handle token cleanup if necessary (response.responses has error info)
        if (response && response.responses) {
           response.responses.forEach((res, idx) => {
             if (!res.success && res.error) {
               // Usually error codes like 'messaging/invalid-registration-token' or 'messaging/registration-token-not-registered'
               // indicate the token is invalid and should be removed.
               if (
                 res.error.code === 'messaging/invalid-registration-token' ||
                 res.error.code === 'messaging/registration-token-not-registered'
               ) {
                 NotificationDevice.deleteOne({ token: tokens[idx] }).catch(err => 
                   logger.error({ err: err.message, token: tokens[idx] }, 'Failed to delete invalid token')
                 );
               }
             }
           });
        }
      }
    }

    logger.info({ jobId, usersProcessed, tokensPushed }, 'Daily digest job completed successfully');
  } catch (error) {
    logger.error({ jobId, error: error.message, stack: error.stack }, 'Daily digest job failed');
  }
}

/**
 * Initialize the cron job.
 * By default, runs every day at 08:00 AM.
 * Cron expression: "0 8 * * *"
 */
function startCronJob(schedule = '0 8 * * *') {
  logger.info({ schedule }, 'Registering daily digest cron job');
  cron.schedule(schedule, () => {
    sendDailyDigest();
  });
}

// If run directly from command line
if (require.main === module) {
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');
  dotenv.config();

  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vruttaant')
    .then(async () => {
      await sendDailyDigest();
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  sendDailyDigest,
  startCronJob
};
