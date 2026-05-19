const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    newsCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsCard',
      default: null,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      index: true
    },
    url: {
      type: String,
      required: true,
      trim: true,
      unique: false
    },
    imageUrl: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      default: ''
    },
    language: {
      type: String,
      default: 'en',
      trim: true
    },
    addedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure user can't bookmark same article twice
bookmarkSchema.index({ userId: 1, url: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, addedAt: -1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
