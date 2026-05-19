'use strict';

jest.mock('firebase-admin');

const admin = require('firebase-admin');

// Reset module state between tests
let pushNotificationService;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

// ─── mock-mode tests (no Firebase init) ──────────────────────────────────────
describe('pushNotificationService — mock mode (no credentials)', () => {
  beforeEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_CONFIG;

    // Re-require after env reset so initialize() runs in mock mode
    jest.resetModules();
    jest.mock('firebase-admin');
    pushNotificationService = require('../src/services/pushNotificationService');
  });

  it('_isInitialized() returns false in mock mode', () => {
    expect(pushNotificationService._isInitialized()).toBe(false);
  });

  it('sendToDevice returns mock result when not initialized', async () => {
    const result = await pushNotificationService.sendToDevice('fake-token', 'Title', 'Body');
    expect(result.mock).toBe(true);
    expect(result.success).toBe(true);
  });

  it('sendToDevice throws when token is missing', async () => {
    await expect(pushNotificationService.sendToDevice(null, 'Title', 'Body')).rejects.toThrow('Device token is required');
  });

  it('sendMulticast returns mock result with correct count when not initialized', async () => {
    const result = await pushNotificationService.sendMulticast(['t1', 't2'], 'Title', 'Body');
    expect(result.mock).toBe(true);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
  });

  it('sendMulticast returns empty result for empty token array', async () => {
    const result = await pushNotificationService.sendMulticast([], 'Title', 'Body');
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(0);
    expect(result.responses).toEqual([]);
  });

  it('sendMulticast handles non-array tokens gracefully', async () => {
    const result = await pushNotificationService.sendMulticast(null, 'Title', 'Body');
    expect(result.successCount).toBe(0);
  });
});

// ─── initialized-mode tests (Firebase mocked) ────────────────────────────────
describe('pushNotificationService — initialized mode (Firebase mocked)', () => {
  beforeEach(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: 'test' });
    jest.resetModules();
    jest.mock('firebase-admin');

    const adminMock = require('firebase-admin');
    adminMock.initializeApp = jest.fn();
    adminMock.credential = { cert: jest.fn().mockReturnValue({}) };

    pushNotificationService = require('../src/services/pushNotificationService');
  });

  afterEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  });

  it('_isInitialized() returns true after initialization', () => {
    expect(pushNotificationService._isInitialized()).toBe(true);
  });

  it('sendToDevice calls admin.messaging().send on success', async () => {
    const sendMock = jest.fn().mockResolvedValue('msg-id-123');
    const adminMock = require('firebase-admin');
    adminMock.messaging = jest.fn().mockReturnValue({ send: sendMock });

    const result = await pushNotificationService.sendToDevice('device-token', 'Title', 'Body', { key: 'val' });
    expect(sendMock).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-id-123');
  });

  it('sendToDevice propagates errors from admin.messaging().send', async () => {
    const adminMock = require('firebase-admin');
    adminMock.messaging = jest.fn().mockReturnValue({ send: jest.fn().mockRejectedValue(new Error('FCM error')) });

    await expect(
      pushNotificationService.sendToDevice('device-token', 'Title', 'Body')
    ).rejects.toThrow('FCM error');
  });

  it('sendMulticast calls admin.messaging().sendEachForMulticast', async () => {
    const multicastMock = jest.fn().mockResolvedValue({ successCount: 2, failureCount: 0, responses: [] });
    const adminMock = require('firebase-admin');
    adminMock.messaging = jest.fn().mockReturnValue({ sendEachForMulticast: multicastMock });

    const result = await pushNotificationService.sendMulticast(['t1', 't2'], 'Title', 'Body');
    expect(multicastMock).toHaveBeenCalled();
    expect(result.successCount).toBe(2);
  });

  it('sendMulticast propagates errors from sendEachForMulticast', async () => {
    const adminMock = require('firebase-admin');
    adminMock.messaging = jest.fn().mockReturnValue({
      sendEachForMulticast: jest.fn().mockRejectedValue(new Error('multicast fail'))
    });

    await expect(
      pushNotificationService.sendMulticast(['t1', 't2'], 'Title', 'Body')
    ).rejects.toThrow('multicast fail');
  });
});
