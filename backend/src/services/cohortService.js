const User = require('../models/User');
const NotificationDevice = require('../models/NotificationDevice');
const UserCohort = require('../models/UserCohort');
const { AppError } = require('../middleware/errorHandler');

/**
 * Derive the set of cohort assignments for a user given their profile and devices.
 *
 * Cohort ID naming conventions:
 *   language_<lang>          e.g. language_en, language_hi
 *   category_<category>      e.g. category_technology  (lowercased, spaces → underscores)
 *   device_<platform>        e.g. device_ios, device_android, device_web
 *   engagement_multi_category  users with 3+ preferred categories
 *   engagement_no_device       users with no registered push devices
 *
 * @param {object} user     - Mongoose User doc (lean or populated)
 * @param {object[]} devices - NotificationDevice lean docs for this user
 * @returns {{ cohortId: string, cohortType: string }[]}
 */
function computeUserCohorts(user, devices) {
  const assignments = [];

  // ── Language cohort ─────────────────────────────────────────────────────────
  const lang = (user.preferences?.language || 'en').toLowerCase().trim();
  assignments.push({ cohortId: `language_${lang}`, cohortType: 'language' });

  // ── Category cohorts ─────────────────────────────────────────────────────────
  const categories = Array.isArray(user.preferences?.categories)
    ? user.preferences.categories
    : [];

  for (const cat of categories) {
    const slug = cat.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (slug) {
      assignments.push({ cohortId: `category_${slug}`, cohortType: 'category' });
    }
  }

  // ── Device cohorts ───────────────────────────────────────────────────────────
  const platforms = [...new Set(devices.map(d => d.platform).filter(Boolean))];
  for (const platform of platforms) {
    assignments.push({ cohortId: `device_${platform}`, cohortType: 'device' });
  }

  // ── Engagement cohorts ───────────────────────────────────────────────────────
  if (categories.length >= 3) {
    assignments.push({ cohortId: 'engagement_multi_category', cohortType: 'engagement' });
  }
  if (devices.length === 0) {
    assignments.push({ cohortId: 'engagement_no_device', cohortType: 'engagement' });
  }

  return assignments;
}

/**
 * Assign (or re-assign) a user to their cohorts.
 * Fetches the user + their devices, computes cohorts, and upserts UserCohort docs.
 * Old cohorts that no longer apply are removed.
 *
 * @param {string} userId
 * @returns {Promise<{ cohortId: string, cohortType: string }[]>} current assignments
 */
async function assignUserToCohorts(userId) {
  if (!userId) throw new AppError(400, 'User ID is required');

  const [user, devices] = await Promise.all([
    User.findById(userId).select('preferences').lean(),
    NotificationDevice.find({ userId, enabled: true }).select('platform').lean()
  ]);

  if (!user) throw new AppError(404, 'User not found');

  const desired = computeUserCohorts(user, devices);
  const desiredIds = desired.map(c => c.cohortId);

  // Upsert each desired cohort (set assignedAt only on insert via $setOnInsert)
  await Promise.all(
    desired.map(({ cohortId, cohortType }) =>
      UserCohort.updateOne(
        { userId, cohortId },
        { $set: { cohortType }, $setOnInsert: { assignedAt: new Date() } },
        { upsert: true }
      )
    )
  );

  // Remove stale cohorts no longer applicable
  await UserCohort.deleteMany({ userId, cohortId: { $nin: desiredIds } });

  return desired;
}

/**
 * Get all cohorts a user currently belongs to.
 *
 * @param {string} userId
 * @returns {Promise<object[]>} cohort docs
 */
async function getUserCohorts(userId) {
  if (!userId) throw new AppError(400, 'User ID is required');

  const cohorts = await UserCohort.find({ userId })
    .select('cohortId cohortType assignedAt -_id')
    .sort({ cohortType: 1, cohortId: 1 })
    .lean();

  return cohorts;
}

/**
 * Return aggregate counts per cohort across all users.
 * Groups by cohortId + cohortType, sorted by count descending.
 *
 * @returns {Promise<{ cohortId, cohortType, userCount }[]>}
 */
async function getCohortStats() {
  const stats = await UserCohort.aggregate([
    {
      $group: {
        _id: { cohortId: '$cohortId', cohortType: '$cohortType' },
        userCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        cohortId: '$_id.cohortId',
        cohortType: '$_id.cohortType',
        userCount: 1
      }
    },
    { $sort: { userCount: -1, cohortId: 1 } }
  ]);

  return stats;
}

/**
 * Paginated list of user IDs belonging to a given cohort.
 *
 * @param {string} cohortId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ users: string[], total: number, page, limit }>}
 */
async function getCohortUsers(cohortId, page = 1, limit = 20) {
  if (!cohortId) throw new AppError(400, 'Cohort ID is required');

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    UserCohort.find({ cohortId })
      .select('userId assignedAt -_id')
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserCohort.countDocuments({ cohortId })
  ]);

  return {
    cohortId,
    users: docs.map(d => ({ userId: String(d.userId), assignedAt: d.assignedAt })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = {
  computeUserCohorts,
  assignUserToCohorts,
  getUserCohorts,
  getCohortStats,
  getCohortUsers
};
