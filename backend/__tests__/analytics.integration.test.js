const request = require('supertest');
const app = require('../src/index');
const UserActivityEvent = require('../src/models/UserActivityEvent');
const NewsCard = require('../src/models/NewsCard');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const { isDatabaseConnected } = require('../src/health/readiness');

jest.mock('../src/health/readiness');
// Removed duplicate imports

describe('analytics integration', () => {
  let adminUser;
  let regularUser;
  let adminToken;
  let regularToken;
  let newsCard;

  beforeEach(async () => {
    jest.clearAllMocks();
    isDatabaseConnected.mockReturnValue(true);

    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'hashed_password',
      role: 'admin'
    });

    regularUser = await User.create({
      email: 'user@test.com',
      password: 'hashed_password',
      role: 'user'
    });

    // Create JWT tokens
    adminToken = jwt.sign(
      { sub: adminUser._id, role: 'admin', email: adminUser.email },
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
    );

    regularToken = jwt.sign(
      { sub: regularUser._id, role: 'user', email: regularUser.email },
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
    );

    // Create test news card
    newsCard = await NewsCard.create({
      title: 'Test Article',
      summary: 'Test summary',
      url: 'https://example.com/article',
      category: 'Tech',
      language: 'en',
      source: 'Test Source',
      publishedAt: new Date()
    });
  });

  afterEach(async () => {
    // Clean up
    await User.deleteMany({});
    await UserActivityEvent.deleteMany({});
    await NewsCard.deleteMany({});
  });

  describe('POST /api/v1/analytics/events', () => {
    it('records a view event without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'view',
          newsCardId: newsCard._id.toString(),
          duration: 5000,
          deviceMetadata: {
            deviceType: 'mobile',
            platform: 'ios'
          }
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Event recorded');

      const event = await UserActivityEvent.findById(response.body.eventId);
      expect(event).toBeDefined();
      expect(event.eventType).toBe('view');
      expect(event.duration).toBe(5000);
      expect(event.userId).toBeUndefined();
    });

    it('records an event with authenticated user', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/events')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          eventType: 'bookmark',
          newsCardId: newsCard._id.toString()
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);

      const event = await UserActivityEvent.findById(response.body.eventId);
      expect(event.userId.toString()).toBe(regularUser._id.toString());
      expect(event.eventType).toBe('bookmark');
    });

    it('records translate event with language pair', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'translate',
          newsCardId: newsCard._id.toString(),
          translation: {
            fromLanguage: 'en',
            toLanguage: 'hi'
          }
        });

      expect(response.statusCode).toBe(201);

      const event = await UserActivityEvent.findById(response.body.eventId);
      expect(event.translation.fromLanguage).toBe('en');
      expect(event.translation.toLanguage).toBe('hi');
    });

    it('captures card metadata at event time', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'view',
          newsCardId: newsCard._id.toString()
        });

      const event = await UserActivityEvent.findById(response.body.eventId);
      expect(event.cardMetadata).toBeDefined();
      expect(event.cardMetadata.title).toBe('Test Article');
      expect(event.cardMetadata.category).toBe('Tech');
      expect(event.cardMetadata.language).toBe('en');
    });

    it('rejects invalid event payload', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'invalid_type',
          newsCardId: newsCard._id.toString()
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 503 when database is unavailable', async () => {
      isDatabaseConnected.mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/analytics/events')
        .send({
          eventType: 'view',
          newsCardId: newsCard._id.toString()
        });

      expect(response.statusCode).toBe(503);
    });
  });

  describe('GET /api/v1/analytics/trending', () => {
    beforeEach(async () => {
      // Create multiple events
      const now = new Date();
      const cards = [];

      for (let i = 0; i < 3; i++) {
        const card = await NewsCard.create({
          title: `Article ${i}`,
          summary: 'Test',
          url: `https://example.com/${i}`,
          category: i % 2 === 0 ? 'Tech' : 'Science',
          language: 'en',
          source: 'Test'
        });
        cards.push(card);
      }

      // Create view events
      await UserActivityEvent.create([
        { eventType: 'view', newsCardId: cards[0]._id, userId: adminUser._id, eventAt: now },
        { eventType: 'view', newsCardId: cards[0]._id, userId: adminUser._id, eventAt: now },
        { eventType: 'view', newsCardId: cards[0]._id, userId: adminUser._id, eventAt: now },
        { eventType: 'view', newsCardId: cards[1]._id, userId: adminUser._id, eventAt: now },
        { eventType: 'view', newsCardId: cards[1]._id, userId: adminUser._id, eventAt: now },
        { eventType: 'view', newsCardId: cards[2]._id, userId: adminUser._id, eventAt: now }
      ]);
    });

    it('returns trending content for admin user', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/trending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.trending).toBeDefined();
      expect(Array.isArray(response.body.trending)).toBe(true);

      // Most viewed should be first
      if (response.body.trending.length > 0) {
        expect(response.body.trending[0].viewCount).toBeGreaterThanOrEqual(
          response.body.trending[response.body.trending.length - 1]?.viewCount || 0
        );
      }
    });

    it('filters trending by category', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/trending')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ category: 'Tech' });

      expect(response.statusCode).toBe(200);

      // All results should be Tech category
      response.body.trending.forEach((item) => {
        expect(item.category).toBe('Tech');
      });
    });

    it('rejects non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/trending')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.statusCode).toBe(403);
    });

    it('returns 503 when database unavailable', async () => {
      isDatabaseConnected.mockReturnValue(false);

      const response = await request(app)
        .get('/api/v1/analytics/trending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(503);
    });
  });

  describe('GET /api/v1/analytics/categories', () => {
    it('returns top categories by engagement (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.categories).toBeDefined();
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    it('rejects unauthenticated users', async () => {
      const response = await request(app).get('/api/v1/analytics/categories');

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/user/engagement', () => {
    it('returns authenticated user engagement summary', async () => {
      // Create some events for the user
      await UserActivityEvent.create([
        { eventType: 'view', newsCardId: newsCard._id, userId: regularUser._id },
        { eventType: 'bookmark', newsCardId: newsCard._id, userId: regularUser._id },
        { eventType: 'view', newsCardId: newsCard._id, userId: regularUser._id }
      ]);

      const response = await request(app)
        .get('/api/v1/analytics/user/engagement')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.engagement).toBeDefined();
      expect(response.body.engagement.totalViews).toBe(2);
      expect(response.body.engagement.totalBookmarks).toBe(1);
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/analytics/user/engagement');

      expect(response.statusCode).toBe(401);
    });
  });
});
