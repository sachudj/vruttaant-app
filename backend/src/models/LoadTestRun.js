const mongoose = require('mongoose');

const scenarioCheckSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    passed: {
      type: Boolean,
      required: true
    },
    actual: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const scenarioResultSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    requestsPerSecond: {
      type: Number,
      required: true,
      min: 0
    },
    latencyP95Ms: {
      type: Number,
      required: true,
      min: 0
    },
    errorRatePercent: {
      type: Number,
      required: true,
      min: 0
    },
    checks: {
      type: [scenarioCheckSchema],
      default: []
    }
  },
  {
    _id: false
  }
);

const loadTestRunSchema = new mongoose.Schema(
  {
    environment: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ['local', 'staging', 'production']
    },
    source: {
      type: String,
      trim: true,
      default: 'manual'
    },
    appVersion: {
      type: String,
      trim: true,
      default: ''
    },
    baseUrl: {
      type: String,
      required: true,
      trim: true
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1
    },
    connections: {
      type: Number,
      required: true,
      min: 1
    },
    overallRate: {
      type: Number,
      required: true,
      min: 1
    },
    strictSlo: {
      type: Boolean,
      default: false
    },
    sloTargets: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    scenarios: {
      type: [scenarioResultSchema],
      default: []
    },
    summary: {
      totalChecks: {
        type: Number,
        required: true,
        min: 0
      },
      passedChecks: {
        type: Number,
        required: true,
        min: 0
      },
      failedChecks: {
        type: Number,
        required: true,
        min: 0
      }
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'load_test_runs'
  }
);

loadTestRunSchema.index({ environment: 1, capturedAt: -1 });
loadTestRunSchema.index({ capturedAt: -1 });

module.exports = mongoose.model('LoadTestRun', loadTestRunSchema);