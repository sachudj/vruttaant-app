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
    lastSyncedAt: {
      type: Date,
      default: null
    },
    failCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

newsSourceSchema.index({ language: 1, enabled: 1 });

module.exports = mongoose.model('NewsSource', newsSourceSchema);
