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
    aiSummary: {
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
    titleFingerprint: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    rawMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    trendScore: {
      type: Number,
      default: 0
    },
    ingestCount: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

newsCardSchema.index({ url: 1, language: 1 }, { unique: true });
newsCardSchema.index({ language: 1, scrapedAt: -1 });
newsCardSchema.index({ language: 1, category: 1, scrapedAt: -1 });
newsCardSchema.index({ language: 1, trendScore: -1 });
newsCardSchema.index({ language: 1, trendScore: -1, scrapedAt: -1 });
newsCardSchema.index({ titleFingerprint: 1, language: 1 });
newsCardSchema.index(
  { title: 'text', summary: 'text', aiSummary: 'text', source: 'text' },
  { language_override: 'none' }
);

module.exports = mongoose.model('NewsCard', newsCardSchema);
