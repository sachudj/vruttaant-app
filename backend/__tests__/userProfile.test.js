const request = require('supertest');
const { app } = require('../src/index');
const User = require('../src/models/User');

// Mock User model
jest.mock('../src/models/User');

// Mock database connection
jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  isDatabaseConnected: jest.fn().mockReturnValue(true),
  getConnection: jest.fn(() => ({ readyState: 1 }))
}));

// Mock auth middleware so we bypass real JWT validation
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
      next();
    }
  };
});

describe('User Profile API', () => {
  let token = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/user/profile');
      expect(res.status).toBe(401);
    });

    it('should return 404 if user not found', async () => {
      User.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('should return the user profile with default preferences', async () => {
      User.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'user-123',
          email: 'profile@example.com',
          role: 'user',
          preferences: { language: 'en', categories: [] }
        })
      });

      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.email).toBe('profile@example.com');
      expect(res.body.profile.preferences.language).toBe('en');
    });
  });

  describe('PATCH /api/v1/user/profile', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).patch('/api/v1/user/profile').send({});
      expect(res.status).toBe(401);
    });

    it('should fail with 400 for invalid preferences structure', async () => {
      const res = await request(app)
        .patch('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferences: 'invalid' });
        
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/object/);
    });

    it('should fail with 400 for invalid language', async () => {
      const res = await request(app)
        .patch('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferences: { language: 123 } });
        
      expect(res.status).toBe(400);
    });

    it('should update preferences with valid data and normalize categories', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'profile@example.com',
        role: 'user',
        preferences: { language: 'en', categories: [] },
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .patch('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferences: {
            language: 'hi',
            categories: ['tech', 'unknown', 'sports', 'TECH']
          }
        });
        
      expect(res.status).toBe(200);
      expect(res.body.profile.preferences.language).toBe('hi');
      expect(res.body.profile.preferences.categories).toEqual(
        expect.arrayContaining(['Tech', 'General', 'Sports'])
      );
      expect(res.body.profile.preferences.categories.length).toBe(3);
      expect(mockUser.save).toHaveBeenCalledTimes(1);
    });
  });
});