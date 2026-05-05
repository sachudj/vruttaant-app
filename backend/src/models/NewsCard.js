const mongoose = require('mongoose');

const newsCardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      default: ''
    },
    url: {
      type: String,
      required: true,
      trim: true
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
    publishedAt: {
      type: Date,
      default: null
    },
    scrapedAt: {
      type: Date,
      default: Date.now
    },
    rawMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

newsCardSchema.index({ url: 1, language: 1 }, { unique: true });

module.exports = mongoose.model('NewsCard', newsCardSchema);
