const request = require('supertest');
const { app } = require('../src/index');
const User = require('../src/models/User');
const NotificationDevice = require('../src/models/NotificationDevice');

jest.mock('../src/models/User');
jest.mock('../src/models/NotificationDevice');

jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  isDatabaseConnected: jest.fn().mockReturnValue(true),
  getConnection: jest.fn(() => ({ readyState: 1 }))
}));

jest.mock('../src/middleware/authMiddleware', () => {
  const original = jest.requireActual('../src/middleware/authMiddleware');
  return {
    ...original,
    verifyAccessToken: (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      }

      const token = authHeader.split(' ')[1];
      if (token !== 'valid-token') {
        return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
      }

      req.user = { id: 'user-123' };
      return next();
    }
  };
});

describe('User Notifications API', () => {
  const token = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/user/notifications/preferences', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/user/notifications/preferences');
      expect(res.status).toBe(401);
    });

    it('returns 404 when user is missing', async () => {
      User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      const res = await request(app)
        .get('/api/v1/user/notifications/preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('User not found.');
    });

    it('returns default notifications when preferences are not set', async () => {
      User.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'user-123',
          preferences: {}
        })
      });

      const res = await request(app)
        .get('/api/v1/user/notifications/preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.enabled).toBe(true);
      expect(res.body.data.notifications.breakingNews).toBe(true);
      expect(res.body.data.notifications.quietHours.timezone).toBe('UTC');
    });
  });

  describe('PATCH /api/v1/user/notifications/preferences', () => {
    it('returns 400 for invalid notifications payload', async () => {
      const res = await request(app)
        .patch('/api/v1/user/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ notifications: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('notifications must be an object');
    });

    it('updates notification preferences with valid payload', async () => {
      const mockUser = {
        _id: 'user-123',
        preferences: {
          language: 'en',
          categories: [],
          notifications: {
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
          }
        },
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .patch('/api/v1/user/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          notifications: {
            breakingNews: false,
            quietHours: {
              enabled: true,
              start: '23:30',
              end: '06:30',
              timezone: 'Asia/Kolkata'
            }
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.breakingNews).toBe(false);
      expect(res.body.data.notifications.quietHours.enabled).toBe(true);
      expect(res.body.data.notifications.quietHours.timezone).toBe('Asia/Kolkata');
      expect(mockUser.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/v1/user/notifications/devices', () => {
    it('returns 400 for invalid platform', async () => {
      const res = await request(app)
        .post('/api/v1/user/notifications/devices')
        .set('Authorization', `Bearer ${token}`)
        .send({ token: 'x'.repeat(40), platform: 'desktop' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('platform must be one of ios, android, web');
    });

    it('registers a notification device', async () => {
      NotificationDevice.findOneAndUpdate.mockResolvedValue({
        _id: 'device-1',
        platform: 'android',
        deviceName: 'Pixel',
        enabled: true,
        lastSeenAt: new Date()
      });

      const res = await request(app)
        .post('/api/v1/user/notifications/devices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          token: 'a'.repeat(64),
          platform: 'android',
          deviceName: 'Pixel'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device.platform).toBe('android');
      expect(NotificationDevice.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/v1/user/notifications/devices', () => {
    it('lists user devices without exposing token', async () => {
      NotificationDevice.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'device-1',
              platform: 'ios',
              deviceName: 'iPhone',
              enabled: true,
              lastSeenAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ])
        })
      });

      const res = await request(app)
        .get('/api/v1/user/notifications/devices')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.devices).toHaveLength(1);
      expect(res.body.data.devices[0].platform).toBe('ios');
      expect(res.body.data.devices[0].token).toBeUndefined();
    });
  });

  describe('DELETE /api/v1/user/notifications/devices/:deviceId', () => {
    it('returns 404 when device is not found', async () => {
      NotificationDevice.findOneAndDelete.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/user/notifications/devices/device-x')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Notification device not found.');
    });

    it('deletes a user device', async () => {
      NotificationDevice.findOneAndDelete.mockResolvedValue({ _id: 'device-1' });

      const res = await request(app)
        .delete('/api/v1/user/notifications/devices/device-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Notification device removed successfully.');
    });
  });
});