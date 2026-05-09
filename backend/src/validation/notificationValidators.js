function buildValidationError(res, message, details) {
  return res.status(400).json({
    success: false,
    error: {
      statusCode: 400,
      message,
      details
    }
  });
}

function isValidTimeHHMM(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function validateNotificationPreferencesUpdate(req, res, next) {
  const { notifications } = req.body || {};

  if (notifications === undefined) {
    req.validated = { body: { notifications: {} } };
    return next();
  }

  if (typeof notifications !== 'object' || notifications === null || Array.isArray(notifications)) {
    return buildValidationError(
      res,
      'notifications must be an object',
      'Invalid notifications payload format'
    );
  }

  const booleanFields = ['enabled', 'breakingNews', 'bookmarkAlerts', 'dailyDigest'];
  for (const field of booleanFields) {
    if (notifications[field] !== undefined && typeof notifications[field] !== 'boolean') {
      return buildValidationError(
        res,
        `${field} must be a boolean`,
        `Invalid ${field} value`
      );
    }
  }

  if (notifications.quietHours !== undefined) {
    const quietHours = notifications.quietHours;
    if (typeof quietHours !== 'object' || quietHours === null || Array.isArray(quietHours)) {
      return buildValidationError(
        res,
        'quietHours must be an object',
        'Invalid quietHours payload format'
      );
    }

    if (quietHours.enabled !== undefined && typeof quietHours.enabled !== 'boolean') {
      return buildValidationError(
        res,
        'quietHours.enabled must be a boolean',
        'Invalid quietHours enabled value'
      );
    }

    if (quietHours.start !== undefined) {
      if (typeof quietHours.start !== 'string' || !isValidTimeHHMM(quietHours.start.trim())) {
        return buildValidationError(
          res,
          'quietHours.start must be in HH:MM format',
          'Invalid quietHours start time'
        );
      }
    }

    if (quietHours.end !== undefined) {
      if (typeof quietHours.end !== 'string' || !isValidTimeHHMM(quietHours.end.trim())) {
        return buildValidationError(
          res,
          'quietHours.end must be in HH:MM format',
          'Invalid quietHours end time'
        );
      }
    }

    if (quietHours.timezone !== undefined) {
      if (typeof quietHours.timezone !== 'string' || !quietHours.timezone.trim()) {
        return buildValidationError(
          res,
          'quietHours.timezone must be a non-empty string',
          'Invalid quietHours timezone'
        );
      }
      if (quietHours.timezone.trim().length > 64) {
        return buildValidationError(
          res,
          'quietHours.timezone is too long',
          'Invalid quietHours timezone length'
        );
      }
    }
  }

  req.validated = {
    body: {
      notifications
    }
  };

  return next();
}

function validateRegisterNotificationDevice(req, res, next) {
  const { token, platform, deviceName } = req.body || {};

  if (typeof token !== 'string' || !token.trim()) {
    return buildValidationError(res, 'token is required', 'Device token is missing');
  }

  const trimmedToken = token.trim();
  if (trimmedToken.length < 20 || trimmedToken.length > 4096) {
    return buildValidationError(res, 'token length is invalid', 'Device token length must be between 20 and 4096 characters');
  }

  const normalizedPlatform = String(platform || '').trim().toLowerCase();
  if (!['ios', 'android', 'web'].includes(normalizedPlatform)) {
    return buildValidationError(res, 'platform must be one of ios, android, web', 'Invalid device platform');
  }

  if (deviceName !== undefined) {
    if (typeof deviceName !== 'string') {
      return buildValidationError(res, 'deviceName must be a string', 'Invalid deviceName value');
    }
    if (deviceName.trim().length > 80) {
      return buildValidationError(res, 'deviceName is too long', 'Invalid deviceName length');
    }
  }

  req.validated = {
    body: {
      token: trimmedToken,
      platform: normalizedPlatform,
      deviceName: String(deviceName || '').trim()
    }
  };

  return next();
}

function validateNotificationDeviceId(req, res, next) {
  const { deviceId } = req.params || {};

  if (typeof deviceId !== 'string' || !deviceId.trim()) {
    return buildValidationError(res, 'deviceId is required', 'Missing notification device ID');
  }

  req.validated = {
    params: {
      deviceId: deviceId.trim()
    }
  };

  return next();
}

module.exports = {
  validateNotificationPreferencesUpdate,
  validateRegisterNotificationDevice,
  validateNotificationDeviceId
};