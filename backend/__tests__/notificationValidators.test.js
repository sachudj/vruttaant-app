'use strict';

const {
  validateNotificationPreferencesUpdate,
  validateRegisterNotificationDevice,
  validateNotificationDeviceId
} = require('../src/validation/notificationValidators');

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const next = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ─── validateNotificationPreferencesUpdate ───────────────────────────────────
describe('validateNotificationPreferencesUpdate', () => {
  it('calls next with empty notifications when notifications is absent', () => {
    const req = { body: {} };
    validateNotificationPreferencesUpdate(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.validated.body.notifications).toEqual({});
  });

  it('returns 400 when notifications is not an object', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: 'bad' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when notifications is an array', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: [] } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('calls next for valid boolean notification fields', () => {
    const req = { body: { notifications: { enabled: true, breakingNews: false, bookmarkAlerts: true, dailyDigest: false } } };
    validateNotificationPreferencesUpdate(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when enabled is not a boolean', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { enabled: 'yes' } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when breakingNews is not a boolean', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { breakingNews: 1 } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quietHours is not an object', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: 'bad' } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quietHours.enabled is not a boolean', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: { enabled: 'yes' } } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quietHours.start has invalid format', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: { start: '25:00' } } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts valid quietHours.start in HH:MM format', () => {
    const req = { body: { notifications: { quietHours: { start: '22:00' } } } };
    validateNotificationPreferencesUpdate(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when quietHours.end has invalid format', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: { end: 'bad' } } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quietHours.timezone is empty string', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: { timezone: '   ' } } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quietHours.timezone is too long', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: { timezone: 'A'.repeat(65) } } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quietHours.timezone is not a string', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: { timezone: 123 } } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts valid quietHours with all fields', () => {
    const req = {
      body: {
        notifications: {
          quietHours: { enabled: true, start: '22:00', end: '07:00', timezone: 'America/New_York' }
        }
      }
    };
    validateNotificationPreferencesUpdate(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when quietHours is null', () => {
    const res = makeRes();
    validateNotificationPreferencesUpdate({ body: { notifications: { quietHours: null } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── validateRegisterNotificationDevice ─────────────────────────────────────
describe('validateRegisterNotificationDevice', () => {
  const VALID_TOKEN = 'a'.repeat(64);

  it('calls next with valid token, platform, and deviceName', () => {
    const req = { body: { token: VALID_TOKEN, platform: 'ios', deviceName: 'iPhone 15' } };
    validateRegisterNotificationDevice(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.validated.body.platform).toBe('ios');
    expect(req.validated.body.token).toBe(VALID_TOKEN);
  });

  it('returns 400 when token is missing', () => {
    const res = makeRes();
    validateRegisterNotificationDevice({ body: { platform: 'ios' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when token is too short (< 20 chars)', () => {
    const res = makeRes();
    validateRegisterNotificationDevice({ body: { token: 'short', platform: 'android' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when token is too long (> 4096 chars)', () => {
    const res = makeRes();
    validateRegisterNotificationDevice({ body: { token: 'a'.repeat(4097), platform: 'android' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid platform', () => {
    const res = makeRes();
    validateRegisterNotificationDevice({ body: { token: VALID_TOKEN, platform: 'windows' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts android platform', () => {
    const req = { body: { token: VALID_TOKEN, platform: 'android' } };
    validateRegisterNotificationDevice(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('accepts web platform', () => {
    const req = { body: { token: VALID_TOKEN, platform: 'web' } };
    validateRegisterNotificationDevice(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when deviceName is not a string', () => {
    const res = makeRes();
    validateRegisterNotificationDevice({ body: { token: VALID_TOKEN, platform: 'ios', deviceName: 123 } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when deviceName is too long', () => {
    const res = makeRes();
    validateRegisterNotificationDevice({ body: { token: VALID_TOKEN, platform: 'ios', deviceName: 'A'.repeat(81) } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('normalizes platform to lowercase', () => {
    const req = { body: { token: VALID_TOKEN, platform: 'IOS' } };
    validateRegisterNotificationDevice(req, makeRes(), next);
    expect(req.validated.body.platform).toBe('ios');
  });

  it('works without deviceName', () => {
    const req = { body: { token: VALID_TOKEN, platform: 'web' } };
    validateRegisterNotificationDevice(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── validateNotificationDeviceId ────────────────────────────────────────────
describe('validateNotificationDeviceId', () => {
  it('calls next with valid deviceId', () => {
    const req = { params: { deviceId: 'device-abc-123' } };
    validateNotificationDeviceId(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.validated.params.deviceId).toBe('device-abc-123');
  });

  it('returns 400 when deviceId is missing', () => {
    const res = makeRes();
    validateNotificationDeviceId({ params: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when deviceId is empty string', () => {
    const res = makeRes();
    validateNotificationDeviceId({ params: { deviceId: '   ' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
