const isValidObjectId = require('../utils/isValidObjectId');

/**
 * Validate incoming user activity event payload
 */
const validateEventPayload = (payload) => {
  const errors = [];

  if (!payload.eventType) {
    errors.push('eventType is required.');
  } else if (!['view', 'bookmark', 'translate', 'share'].includes(payload.eventType)) {
    errors.push('eventType must be one of: view, bookmark, translate, share.');
  }

  if (!payload.newsCardId) {
    errors.push('newsCardId is required.');
  } else if (!isValidObjectId(payload.newsCardId)) {
    errors.push('newsCardId must be a valid MongoDB ObjectId.');
  }

  // Duration only for view events
  if (payload.eventType === 'view' && payload.duration !== undefined) {
    const duration = Number(payload.duration);
    if (isNaN(duration) || duration < 0 || duration > 3600000) {
      // Max 1 hour
      errors.push('duration must be a number between 0 and 3600000 milliseconds.');
    }
  }

  // Translation fields only for translate events
  if (payload.eventType === 'translate') {
    if (!payload.translation || !payload.translation.fromLanguage || !payload.translation.toLanguage) {
      errors.push('translation.fromLanguage and translation.toLanguage are required for translate events.');
    }
  }

  // Device metadata is optional but validate if provided
  if (payload.deviceMetadata) {
    const validDeviceTypes = ['mobile', 'web', 'tablet'];
    if (payload.deviceMetadata.deviceType && !validDeviceTypes.includes(payload.deviceMetadata.deviceType)) {
      errors.push('deviceMetadata.deviceType must be one of: mobile, web, tablet.');
    }

    const validPlatforms = ['ios', 'android', 'web'];
    if (payload.deviceMetadata.platform && !validPlatforms.includes(payload.deviceMetadata.platform)) {
      errors.push('deviceMetadata.platform must be one of: ios, android, web.');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    value: errors.length === 0 ? payload : undefined
  };
};

/**
 * Validate analytics query parameters for dashboard APIs
 */
const validateAnalyticsQuery = (payload) => {
  const errors = [];

  // Optional: category filter
  if (payload.category && typeof payload.category !== 'string') {
    errors.push('category must be a string.');
  }

  // Optional: date range (ISO 8601)
  if (payload.startDate && typeof payload.startDate !== 'string') {
    errors.push('startDate must be an ISO 8601 date string.');
  } else if (payload.startDate) {
    try {
      new Date(payload.startDate).toISOString();
    } catch {
      errors.push('startDate must be a valid ISO 8601 date.');
    }
  }

  if (payload.endDate && typeof payload.endDate !== 'string') {
    errors.push('endDate must be an ISO 8601 date string.');
  } else if (payload.endDate) {
    try {
      new Date(payload.endDate).toISOString();
    } catch {
      errors.push('endDate must be a valid ISO 8601 date.');
    }
  }

  // Optional: pagination
  let page = 1;
  let limit = 20;
  if (payload.page !== undefined) {
    const p = Number(payload.page);
    if (isNaN(p) || p < 1) {
      errors.push('page must be a positive number.');
    } else {
      page = p;
    }
  }

  if (payload.limit !== undefined) {
    const l = Number(payload.limit);
    if (isNaN(l) || l < 1) {
      errors.push('limit must be a positive number.');
    } else {
      limit = Math.min(l, 100); // Cap at 100
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    value:
      errors.length === 0
        ? {
            category: payload.category,
            startDate: payload.startDate ? new Date(payload.startDate) : undefined,
            endDate: payload.endDate ? new Date(payload.endDate) : undefined,
            page,
            limit
          }
        : undefined
  };
};

module.exports = {
  validateEventPayload,
  validateAnalyticsQuery
};
