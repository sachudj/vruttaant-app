const NotificationDevice = require('../models/NotificationDevice');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

function defaultNotificationPreferences() {
  return {
    enabled: true,
    breakingNews: true,
    bookmarkAlerts: true,
    dailyDigest: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
      timezone: 'UTC'
    }
  };
}

function normalizeNotificationPreferences(input) {
  const defaults = defaultNotificationPreferences();
  const source = input && typeof input === 'object' ? input : {};
  const sourceQuiet = source.quietHours && typeof source.quietHours === 'object'
    ? source.quietHours
    : {};

  return {
    enabled: source.enabled !== undefined ? Boolean(source.enabled) : defaults.enabled,
    breakingNews: source.breakingNews !== undefined
      ? Boolean(source.breakingNews)
      : defaults.breakingNews,
    bookmarkAlerts: source.bookmarkAlerts !== undefined
      ? Boolean(source.bookmarkAlerts)
      : defaults.bookmarkAlerts,
    dailyDigest: source.dailyDigest !== undefined
      ? Boolean(source.dailyDigest)
      : defaults.dailyDigest,
    quietHours: {
      enabled: sourceQuiet.enabled !== undefined
        ? Boolean(sourceQuiet.enabled)
        : defaults.quietHours.enabled,
      start: typeof sourceQuiet.start === 'string' && sourceQuiet.start.trim()
        ? sourceQuiet.start.trim()
        : defaults.quietHours.start,
      end: typeof sourceQuiet.end === 'string' && sourceQuiet.end.trim()
        ? sourceQuiet.end.trim()
        : defaults.quietHours.end,
      timezone: typeof sourceQuiet.timezone === 'string' && sourceQuiet.timezone.trim()
        ? sourceQuiet.timezone.trim()
        : defaults.quietHours.timezone
    }
  };
}

async function getNotificationPreferences(req, res, next) {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId, { preferences: 1 }).lean();

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    const notifications = normalizeNotificationPreferences(user.preferences?.notifications);

    return res.status(200).json({
      success: true,
      data: {
        notifications
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function updateNotificationPreferences(req, res, next) {
  try {
    const userId = req.user?.id;
    const incoming = req.validated?.body?.notifications || {};
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    const current = normalizeNotificationPreferences(user.preferences?.notifications);
    const merged = {
      ...current,
      ...incoming,
      quietHours: {
        ...current.quietHours,
        ...(incoming.quietHours || {})
      }
    };

    if (!user.preferences || typeof user.preferences !== 'object') {
      user.preferences = { language: 'en', categories: [] };
    }
    user.preferences.notifications = normalizeNotificationPreferences(merged);

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully.',
      data: {
        notifications: user.preferences.notifications
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function registerNotificationDevice(req, res, next) {
  try {
    const userId = req.user?.id;
    const { token, platform, deviceName } = (req.validated && req.validated.body) || {};

    const device = await NotificationDevice.findOneAndUpdate(
      { userId, token },
      {
        $set: {
          platform,
          deviceName,
          enabled: true,
          lastSeenAt: new Date()
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Notification device registered successfully.',
      data: {
        device: {
          id: String(device._id),
          platform: device.platform,
          deviceName: device.deviceName,
          enabled: device.enabled,
          lastSeenAt: device.lastSeenAt
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function listNotificationDevices(req, res, next) {
  try {
    const userId = req.user?.id;
    const devices = await NotificationDevice.find(
      { userId },
      { token: 0 }
    )
      .sort({ lastSeenAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        devices: devices.map((d) => ({
          id: String(d._id),
          platform: d.platform,
          deviceName: d.deviceName,
          enabled: d.enabled,
          lastSeenAt: d.lastSeenAt,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteNotificationDevice(req, res, next) {
  try {
    const userId = req.user?.id;
    const { deviceId } = (req.validated && req.validated.params) || {};

    const deleted = await NotificationDevice.findOneAndDelete({
      _id: deviceId,
      userId
    });

    if (!deleted) {
      throw new AppError(404, 'Notification device not found.');
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Notification device removed successfully.'
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  registerNotificationDevice,
  listNotificationDevices,
  deleteNotificationDevice
};