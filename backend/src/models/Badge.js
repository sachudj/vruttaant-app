const mongoose = require('mongoose');

/**
 * Badge Definition Model
 * Defines available badges in the system (can be extended with new badge types)
 */
const badgeSchema = new mongoose.Schema(
  {
    // Unique badge identifier (e.g., 'first_read', 'avid_reader')
    badgeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true
    },

    // Human-readable badge name (e.g., 'First Read', 'Avid Reader')
    name: {
      type: String,
      required: true
    },

    // Detailed description of badge criteria
    description: {
      type: String,
      required: true
    },

    // Badge category: 'views', 'categories', 'bookmarks', 'translations', 'shares', 'streaks'
    category: {
      type: String,
      enum: ['views', 'categories', 'bookmarks', 'translations', 'shares', 'streaks', 'engagement'],
      required: true,
      index: true
    },

    // Badge icon/emoji for display
    icon: {
      type: String,
      default: '🏆'
    },

    // Color hex code for badge display
    color: {
      type: String,
      default: '#FFD700' // Gold
    },

    // Tier/difficulty level: 'bronze', 'silver', 'gold', 'platinum'
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },

    // Criteria object: contains the conditions to earn this badge
    // Example: { type: 'views', threshold: 10 }
    // Example: { type: 'categories', threshold: 5 }
    // Example: { type: 'bookmarks', threshold: 25 }
    // Example: { type: 'translations', threshold: 5 }
    // Example: { type: 'languages', threshold: 3 }
    // Example: { type: 'daily_streak', threshold: 7 }
    criteria: {
      // Criterion type
      type: {
        type: String,
        required: true,
        enum: [
          'total_views',
          'total_categories',
          'total_bookmarks',
          'total_translations',
          'total_shares',
          'unique_languages',
          'daily_streak',
          'avg_read_time'
        ]
      },

      // Numeric threshold for this criterion
      threshold: {
        type: Number,
        required: true,
        min: 1
      },

      // Optional: operator for numeric comparisons ('gte', 'gt', 'eq')
      operator: {
        type: String,
        enum: ['gte', 'gt', 'eq'],
        default: 'gte'
      }
    },

    // Whether this badge is currently active in the system
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Display order (for UI badge gallery)
    displayOrder: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'badges'
  }
);

module.exports = mongoose.model('Badge', badgeSchema);
