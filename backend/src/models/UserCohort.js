const mongoose = require('mongoose');

const userCohortSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    cohortId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    cohortType: {
      type: String,
      enum: ['language', 'category', 'device', 'engagement'],
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Prevent duplicate assignments; one row per (user, cohort)
userCohortSchema.index({ userId: 1, cohortId: 1 }, { unique: true });
userCohortSchema.index({ userId: 1, cohortType: 1, cohortId: 1 });
userCohortSchema.index({ cohortId: 1, assignedAt: -1 });

module.exports = mongoose.model('UserCohort', userCohortSchema);
