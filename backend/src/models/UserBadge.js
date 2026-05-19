const mongoose = require('mongoose');

/**
 * User Badge Model
 * Tracks which badges a user has earned and when
 */
const userBadgeSchema = new mongoose.Schema(
  {
    // Reference to the user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Reference to the badge definition
    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge',
      required: true,
      index: true
    },

    // Badge ID string (cached for easy display without population)
    badgeIdStr: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    // When the badge was earned
    earnedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    // Current progress toward this badge (0-1 where 1 = earned)
    // Useful for showing progress bars in UI (e.g., "5 of 10 articles read for Avid Reader")
    progress: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },

    // Optional: metric value when earned (e.g., number of views = 10)
    metricValue: {
      type: Number,
      default: null
    },

    // Whether user has viewed/acknowledged this badge
    viewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'user_badges'
  }
);

// Compound index to ensure user can only earn each badge once
userBadgeSchema.index({ userId: 1, badgeIdStr: 1 }, { unique: true });

// Index for efficient queries of user's recent badges
userBadgeSchema.index({ userId: 1, earnedAt: -1 });

module.exports = mongoose.model('UserBadge', userBadgeSchema);
