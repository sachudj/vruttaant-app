const admin = require('firebase-admin');
const logger = require('../observability/logger');

let isInitialized = false;

// Initialize Firebase Admin SDK
function initialize() {
  if (isInitialized) return;

  try {
    // If running in an environment with GOOGLE_APPLICATION_CREDENTIALS set,
    // firebase-admin will automatically discover it.
    // Alternatively, we could check for FIREBASE_SERVICE_ACCOUNT_JSON.
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isInitialized = true;
      logger.info('Firebase Admin initialized with explicit service account JSON.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG) {
      admin.initializeApp();
      isInitialized = true;
      logger.info('Firebase Admin initialized via default credentials.');
    } else {
      logger.warn('Firebase Admin credentials not found. PushNotificationService will run in mock mode.');
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to initialize Firebase Admin');
  }
}

// Call initialize immediately
initialize();

/**
 * Helper to construct the message payload
 */
function createMessage(token, title, body, data = {}) {
  return {
    token,
    notification: {
      title,
      body
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for flutter
    },
    android: {
      priority: 'high'
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          sound: 'default'
        }
      }
    }
  };
}

/**
 * Send a notification to a single device token.
 */
async function sendToDevice(token, title, body, data = {}) {
  if (!token) throw new Error('Device token is required');

  const message = createMessage(token, title, body, data);

  if (!isInitialized) {
    logger.info({ message }, '[MOCK PUSH] Would send notification to single device');
    return { mock: true, success: true, messageId: 'mock-id' };
  }

  try {
    const response = await admin.messaging().send(message);
    logger.debug({ token, messageId: response }, 'Successfully sent push notification');
    return { success: true, messageId: response };
  } catch (error) {
    logger.error({ token, error: error.message }, 'Failed to send push notification');
    // We can also handle specific errors like token unregistered here
    throw error;
  }
}

/**
 * Send a notification to multiple device tokens (multicast).
 */
async function sendMulticast(tokens, title, body, data = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const message = {
    tokens,
    notification: { title, body },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: { priority: 'high' },
    apns: {
      payload: { aps: { contentAvailable: true, sound: 'default' } }
    }
  };

  if (!isInitialized) {
    logger.info({ tokensCount: tokens.length, title }, '[MOCK PUSH] Would send multicast notification');
    return { mock: true, successCount: tokens.length, failureCount: 0, responses: [] };
  }

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(
      { successCount: response.successCount, failureCount: response.failureCount },
      'Multicast push notification complete'
    );
    
    // Optionally return failed tokens so the caller can clean them up from the DB
    return response;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to send multicast push notification');
    throw error;
  }
}

module.exports = {
  sendToDevice,
  sendMulticast,
  // export for testing
  _isInitialized: () => isInitialized,
  _resetInitialization: () => { isInitialized = false; }
};
