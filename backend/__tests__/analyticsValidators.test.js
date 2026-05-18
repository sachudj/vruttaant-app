const {
  validateEventPayload,
  validateAnalyticsQuery
} = require('../src/validation/analyticsValidators');
const mongoose = require('mongoose');

describe('analyticsValidators', () => {
  describe('validateEventPayload', () => {
    it('accepts valid view event payload', () => {
      const result = validateEventPayload({
        eventType: 'view',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        duration: 5000
      });

      expect(result.valid).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('accepts valid bookmark event payload', () => {
      const result = validateEventPayload({
        eventType: 'bookmark',
        newsCardId: new mongoose.Types.ObjectId().toString()
      });

      expect(result.valid).toBe(true);
    });

    it('accepts valid translate event with language pair', () => {
      const result = validateEventPayload({
        eventType: 'translate',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        translation: {
          fromLanguage: 'en',
          toLanguage: 'hi'
        }
      });

      expect(result.valid).toBe(true);
    });

    it('accepts valid share event', () => {
      const result = validateEventPayload({
        eventType: 'share',
        newsCardId: new mongoose.Types.ObjectId().toString()
      });

      expect(result.valid).toBe(true);
    });

    it('rejects when eventType is missing', () => {
      const result = validateEventPayload({
        newsCardId: new mongoose.Types.ObjectId().toString()
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('eventType is required.');
    });

    it('rejects invalid eventType values', () => {
      const result = validateEventPayload({
        eventType: 'like',
        newsCardId: new mongoose.Types.ObjectId().toString()
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('eventType must be one of: view, bookmark, translate, share.');
    });

    it('rejects when newsCardId is missing', () => {
      const result = validateEventPayload({
        eventType: 'view'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('newsCardId is required.');
    });

    it('rejects invalid ObjectId format', () => {
      const result = validateEventPayload({
        eventType: 'view',
        newsCardId: 'invalid-id'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('newsCardId must be a valid MongoDB ObjectId.');
    });

    it('rejects duration > 1 hour for view events', () => {
      const result = validateEventPayload({
        eventType: 'view',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        duration: 3600001
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('duration must be a number between 0 and 3600000 milliseconds.');
    });

    it('rejects negative duration for view events', () => {
      const result = validateEventPayload({
        eventType: 'view',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        duration: -100
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('duration must be a number between 0 and 3600000 milliseconds.');
    });

    it('rejects translate event without language pair', () => {
      const result = validateEventPayload({
        eventType: 'translate',
        newsCardId: new mongoose.Types.ObjectId().toString()
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'translation.fromLanguage and translation.toLanguage are required for translate events.'
      );
    });

    it('rejects translate event with incomplete language pair', () => {
      const result = validateEventPayload({
        eventType: 'translate',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        translation: {
          fromLanguage: 'en'
        }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'translation.fromLanguage and translation.toLanguage are required for translate events.'
      );
    });

    it('accepts device metadata when valid', () => {
      const result = validateEventPayload({
        eventType: 'view',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        deviceMetadata: {
          deviceType: 'mobile',
          platform: 'ios',
          appVersion: '1.0.0',
          locale: 'en-US'
        }
      });

      expect(result.valid).toBe(true);
    });

    it('rejects invalid device type', () => {
      const result = validateEventPayload({
        eventType: 'view',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        deviceMetadata: {
          deviceType: 'smartwatch'
        }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deviceMetadata.deviceType must be one of: mobile, web, tablet.');
    });

    it('rejects invalid platform', () => {
      const result = validateEventPayload({
        eventType: 'view',
        newsCardId: new mongoose.Types.ObjectId().toString(),
        deviceMetadata: {
          platform: 'windows'
        }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deviceMetadata.platform must be one of: ios, android, web.');
    });
  });

  describe('validateAnalyticsQuery', () => {
    it('accepts empty query with defaults', () => {
      const result = validateAnalyticsQuery({});

      expect(result.valid).toBe(true);
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(20);
    });

    it('accepts category filter', () => {
      const result = validateAnalyticsQuery({
        category: 'Tech'
      });

      expect(result.valid).toBe(true);
      expect(result.value.category).toBe('Tech');
    });

    it('accepts valid date range', () => {
      const startDate = '2026-05-10T00:00:00Z';
      const endDate = '2026-05-18T23:59:59Z';

      const result = validateAnalyticsQuery({
        startDate,
        endDate
      });

      expect(result.valid).toBe(true);
      expect(result.value.startDate).toBeInstanceOf(Date);
      expect(result.value.endDate).toBeInstanceOf(Date);
    });

    it('accepts pagination parameters', () => {
      const result = validateAnalyticsQuery({
        page: '2',
        limit: '50'
      });

      expect(result.valid).toBe(true);
      expect(result.value.page).toBe(2);
      expect(result.value.limit).toBe(50);
    });

    it('caps limit to maximum 100', () => {
      const result = validateAnalyticsQuery({
        limit: '500'
      });

      expect(result.valid).toBe(true);
      expect(result.value.limit).toBe(100);
    });

    it('rejects invalid page (non-numeric)', () => {
      const result = validateAnalyticsQuery({
        page: 'abc'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('page must be a positive number.');
    });

    it('rejects invalid page (zero or negative)', () => {
      const result = validateAnalyticsQuery({
        page: '0'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('page must be a positive number.');
    });

    it('rejects invalid limit (non-numeric)', () => {
      const result = validateAnalyticsQuery({
        limit: 'xyz'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('limit must be a positive number.');
    });

    it('rejects invalid startDate format', () => {
      const result = validateAnalyticsQuery({
        startDate: 'not-a-date'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('startDate must be a valid ISO 8601 date.');
    });

    it('rejects invalid endDate format', () => {
      const result = validateAnalyticsQuery({
        endDate: 'invalid-date'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('endDate must be a valid ISO 8601 date.');
    });
  });
});
