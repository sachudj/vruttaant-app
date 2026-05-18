const UserActivityEvent = require('../models/UserActivityEvent');
const logger = require('../observability/logger');

/**
 * Capture user activity events asynchronously (non-blocking)
 * Extracts eventType and cardId from request, attaches to res.locals for handler use
 */
const eventCaptureMiddleware = (req, res, next) => {
  // Store original end and json methods to intercept responses
  const originalEnd = res.end;
  const originalJson = res.json;

  // Capture event data from request
  const captureEvent = async (eventData) => {
    try {
      if (!eventData || !eventData.newsCardId || !eventData.eventType) {
        return; // Skip if invalid
      }

      const event = {
        userId: req.user?._id || undefined,
        sessionId: req.sessionId || undefined,
        newsCardId: eventData.newsCardId,
        eventType: eventData.eventType,
        duration: eventData.duration,
        translation: eventData.translation,
        deviceMetadata: {
          deviceType: req.headers['x-device-type'] || 'web',
          platform: req.headers['x-platform'],
          appVersion: req.headers['x-app-version'],
          locale: req.headers['x-locale']
        }
      };

      // Fetch card metadata at event time for analytics preservation
      if (eventData.newsCardId) {
        try {
          const NewsCard = require('../models/NewsCard');
          const card = await NewsCard.findById(eventData.newsCardId).lean();
          if (card) {
            event.cardMetadata = {
              title: card.title,
              category: card.category,
              language: card.language,
              source: card.source,
              publishedAt: card.publishedAt
            };
          }
        } catch (err) {
          logger.error('Failed to fetch card metadata for event', { error: err.message });
        }
      }

      // Create event in DB (fire and forget)
      UserActivityEvent.create(event).catch((err) => {
        logger.error('Failed to create activity event', { error: err.message, eventType: event.eventType });
      });
    } catch (err) {
      logger.error('Error in event capture', { error: err.message });
    }
  };

  // Override res.json to capture events after response is sent
  res.json = function (data) {
    // Capture event from response data if statusCode is successful
    if (res.statusCode >= 200 && res.statusCode < 300 && res.locals.captureEvent) {
      captureEvent(res.locals.captureEvent).catch((err) => {
        logger.error('Async event capture failed', { error: err.message });
      });
    }

    // Call original json
    return originalJson.call(this, data);
  };

  // Override res.end for raw responses
  res.end = function (...args) {
    if (res.statusCode >= 200 && res.statusCode < 300 && res.locals.captureEvent) {
      captureEvent(res.locals.captureEvent).catch((err) => {
        logger.error('Async event capture failed', { error: err.message });
      });
    }

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Helper to trigger event capture in route handlers
 * Usage: res.locals.captureEvent = { eventType: 'view', newsCardId: id };
 */
const trackEvent = (eventType, newsCardId, metadata = {}) => {
  return {
    eventType,
    newsCardId,
    ...metadata
  };
};

module.exports = {
  eventCaptureMiddleware,
  trackEvent
};
