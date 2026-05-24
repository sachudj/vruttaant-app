const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: false,
      default: null
    },
    authProviders: {
      password: {
        type: Boolean,
        default: true
      },
      googleSub: {
        type: String,
        default: null,
        trim: true
      },
      appleSub: {
        type: String,
        default: null,
        trim: true
      }
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    preferences: {
      language: {
        type: String,
        default: 'en',
        trim: true,
        lowercase: true
      },
      categories: {
        type: [String],
        default: []
      },
      notifications: {
        enabled: {
          type: Boolean,
          default: true
        },
        breakingNews: {
          type: Boolean,
          default: true
        },
        bookmarkAlerts: {
          type: Boolean,
          default: true
        },
        dailyDigest: {
          type: Boolean,
          default: false
        },
        quietHours: {
          enabled: {
            type: Boolean,
            default: false
          },
          start: {
            type: String,
            default: '22:00'
          },
          end: {
            type: String,
            default: '07:00'
          },
          timezone: {
            type: String,
            default: 'UTC'
          }
        }
      }
    }
  },
  {
    timestamps: true
  }
);

// Enforce provider-sub uniqueness only when a real string value exists.
userSchema.index(
  { 'authProviders.googleSub': 1 },
  {
    unique: true,
    partialFilterExpression: { 'authProviders.googleSub': { $type: 'string' } }
  }
);

userSchema.index(
  { 'authProviders.appleSub': 1 },
  {
    unique: true,
    partialFilterExpression: { 'authProviders.appleSub': { $type: 'string' } }
  }
);

module.exports = mongoose.model('User', userSchema);
