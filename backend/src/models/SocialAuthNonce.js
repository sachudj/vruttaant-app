const mongoose = require('mongoose');

const socialAuthNonceSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['apple', 'google'],
      required: true,
      index: true
    },
    nonceHash: {
      type: String,
      required: true
    },
    providerSub: {
      type: String,
      default: null,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

socialAuthNonceSchema.index({ provider: 1, nonceHash: 1 }, { unique: true });
socialAuthNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SocialAuthNonce', socialAuthNonceSchema);