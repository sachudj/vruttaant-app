const mongoose = require('mongoose');

/**
 * Tracks the current database schema migration version.
 * Only one document should exist in this collection.
 */
const schemaVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      default: 0
    },
    description: {
      type: String,
      default: ''
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

module.exports = mongoose.model('SchemaVersion', schemaVersionSchema);
