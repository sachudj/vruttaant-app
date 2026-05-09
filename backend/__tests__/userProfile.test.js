const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/index');
const User = require('../src/models/User');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');

jest.mock('../src/config/database', () => {
  const original = jest.requireActual('../src/config/database');
  return {
    ...original,
    isDatabaseConnected: jest.fn().mockReturnValue(true)
  };
});

describe('User Profile API', () => {
  let token;
  let userId;

  beforeAll(async () => {
    await connectDatabase();
    
    // Clear DB
    await User.deleteMany({});
    
    // Create User
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'profile@example.com', password: 'password123' });
      
    token = res.body.data.tokens.accessToken;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/user/profile');
      expect(res.status).toBe(401);
    });

    it('should return the user profile with default preferences', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.email).toBe('profile@example.com');
      expect(res.body.profile.preferences).toBeDefined();
      expect(res.body.profile.preferences.language).toBe('en');
      expect(res.body.profile.preferences.categories).toEqual([]);
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
      expect(res.body.error.message).toMatch(/code/);
    });

    it('should update preferences with valid data and normalize categories', async () => {
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
      // "unknown" -> General, "tech" -> Tech, "TECH" -> deduplicated
      expect(res.body.profile.preferences.categories).toEqual(
        expect.arrayContaining(['Tech', 'General', 'Sports'])
      );
      expect(res.body.profile.preferences.categories.length).toBe(3);
    });

    it('should persist the preferences updates to the database', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).toBe(200);
      expect(res.body.profile.preferences.language).toBe('hi');
      expect(res.body.profile.preferences.categories.length).toBe(3);
    });
  });
});