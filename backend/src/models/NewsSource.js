const mongoose = require('mongoose');

const newsSourceSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    language: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    name: {
      type: String,
      default: '',
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    maxItems: {
      type: Number,
      default: 20
    },
    priority: {
      type: Number,
      default: 100,
      index: true
    },
    reliabilityScore: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
      index: true
    },
    lastSyncedAt: {
      type: Date,
      default: null
    },
    suspendedUntil: {
      type: Date,
      default: null,
      index: true
    },
    failCount: {
      type: Number,
      default: 0
    },
    lastError: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

newsSourceSchema.index({ language: 1, enabled: 1 });
newsSourceSchema.index({ enabled: 1, suspendedUntil: 1, priority: 1, reliabilityScore: -1 });

module.exports = mongoose.model('NewsSource', newsSourceSchema);
