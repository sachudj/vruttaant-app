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
      required: true
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

module.exports = mongoose.model('User', userSchema);
