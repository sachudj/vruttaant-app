const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true
    },
    replacedByJti: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
