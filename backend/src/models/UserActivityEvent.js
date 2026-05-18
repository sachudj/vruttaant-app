const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    // User reference (optional for anonymous users)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true
    },

    // Session ID for tracking anonymous users
    sessionId: {
      type: String,
      index: true,
    },

    // Event type classification
    eventType: {
      type: String,
      enum: ['view', 'bookmark', 'translate', 'share'],
      required: true,
      index: true
    },

    // Reference to the article
    newsCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsCard',
      required: true,
      index: true
    },

    // Article metadata snapshot for analytics (prevents loss when card is deleted)
    cardMetadata: {
      title: String,
      category: String,
      language: String,
      source: String,
      publishedAt: Date
    },

    // Duration in milliseconds (for view events)
    duration: {
      type: Number,
      min: 0,
    },

    // Translation details (for translate events)
    translation: {
      fromLanguage: String,
      toLanguage: String
    },

    // Device/Browser metadata for analytics
    deviceMetadata: {
      deviceType: String, // 'mobile', 'web', 'tablet'
      platform: String,   // 'ios', 'android', 'web'
      appVersion: String,
      locale: String
    },

    // User location (if available and permitted)
    location: {
      country: String,
      region: String,
    }
  },
  {
    timestamps: { createdAt: 'eventAt', updatedAt: false },
    collection: 'user_activity_events'
  }
);

// Compound indexes for efficient queries
eventSchema.index({ userId: 1, eventAt: -1 });
eventSchema.index({ newsCardId: 1, eventAt: -1 });
eventSchema.index({ eventType: 1, eventAt: -1 });
eventSchema.index({ 'cardMetadata.category': 1, eventAt: -1 });
eventSchema.index({ sessionId: 1, eventAt: -1 }, { sparse: true });

// TTL index: auto-delete events older than 90 days
eventSchema.index({ eventAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('UserActivityEvent', eventSchema);
