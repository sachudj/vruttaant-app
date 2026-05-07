const {
  validateCreateBookmarkPayload,
  validateListBookmarksQuery,
  validateDeleteBookmarkParams,
  isUrl,
  isLanguageCode,
  isMongoId
} = require('../src/validation/bookmarkValidators');

describe('bookmarkValidators', () => {
  describe('isUrl', () => {
    it('should validate correct URLs', () => {
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('http://example.com/path')).toBe(true);
      expect(isUrl('https://example.com:8080/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isUrl('not a url')).toBe(false);
      expect(isUrl('example.com')).toBe(false);
      expect(isUrl('')).toBe(false);
    });
  });

  describe('isLanguageCode', () => {
    it('should validate supported language codes', () => {
      expect(isLanguageCode('en')).toBe(true);
      expect(isLanguageCode('hi')).toBe(true);
      expect(isLanguageCode('bn')).toBe(true);
      expect(isLanguageCode('mr')).toBe(true);
      expect(isLanguageCode('EN')).toBe(true); // case insensitive
      expect(isLanguageCode('Hi')).toBe(true);
    });

    it('should reject unsupported language codes', () => {
      expect(isLanguageCode('xx')).toBe(false);
      expect(isLanguageCode('es')).toBe(false);
      expect(isLanguageCode('')).toBe(false);
    });
  });

  describe('isMongoId', () => {
    it('should validate MongoDB ObjectIds', () => {
      expect(isMongoId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isMongoId('507f191e810c19729de860ea')).toBe(true);
    });

    it('should reject invalid ObjectIds', () => {
      expect(isMongoId('not-a-mongo-id')).toBe(false);
      expect(isMongoId('507f1f77bcf86cd79943901')).toBe(false); // too short
      expect(isMongoId('507f1f77bcf86cd799439011x')).toBe(false); // invalid char
      expect(isMongoId('')).toBe(false);
    });
  });

  describe('validateCreateBookmarkPayload', () => {
    it('should validate correct payload', () => {
      const payload = {
        title: 'Breaking News',
        url: 'https://example.com/article',
        summary: 'Summary text',
        category: 'Technology',
        imageUrl: 'https://example.com/image.jpg',
        source: 'Example News',
        language: 'en',
        notes: 'Important'
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.value).toMatchObject({
        title: 'Breaking News',
        url: 'https://example.com/article',
        summary: 'Summary text',
        category: 'Technology',
        language: 'en'
      });
      expect(result.errors).toBeUndefined();
    });

    it('should validate minimal required fields', () => {
      const payload = {
        title: 'Article Title',
        url: 'https://example.com/article'
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.value.title).toBe('Article Title');
      expect(result.value.url).toBe('https://example.com/article');
      expect(result.value.category).toBe('General'); // default
      expect(result.value.language).toBe('en'); // default
    });

    it('should require title', () => {
      const payload = {
        url: 'https://example.com/article'
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/title/)
      ]));
    });

    it('should require valid URL', () => {
      const payload = {
        title: 'Article',
        url: 'not a url'
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/url/)
      ]));
    });

    it('should reject empty title', () => {
      const payload = {
        title: '   ',
        url: 'https://example.com'
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/title/)
      ]));
    });

    it('should reject invalid imageUrl', () => {
      const payload = {
        title: 'Article',
        url: 'https://example.com',
        imageUrl: 'not a url'
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/imageUrl/)
      ]));
    });

    it('should allow empty imageUrl', () => {
      const payload = {
        title: 'Article',
        url: 'https://example.com',
        imageUrl: ''
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid language code', () => {
      const payload = {
        title: 'Article',
        url: 'https://example.com',
        language: 'xx'
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/language/)
      ]));
    });

    it('should trim whitespace from fields', () => {
      const payload = {
        title: '  Article Title  ',
        url: 'https://example.com/article',
        summary: '  Summary  ',
        notes: '  Notes  '
      };

      const result = validateCreateBookmarkPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.value.title).toBe('Article Title');
      expect(result.value.summary).toBe('Summary');
      expect(result.value.notes).toBe('Notes');
    });
  });

  describe('validateListBookmarksQuery', () => {
    it('should validate correct query params', () => {
      const query = {
        category: 'Technology',
        language: 'en',
        page: 1,
        limit: 20
      };

      const result = validateListBookmarksQuery(query);

      expect(result.valid).toBe(true);
      expect(result.value).toEqual({
        category: 'Technology',
        language: 'en',
        page: 1,
        limit: 20
      });
    });

    it('should use default pagination values', () => {
      const query = {};

      const result = validateListBookmarksQuery(query);

      expect(result.valid).toBe(true);
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(20);
      expect(result.value.category).toBeUndefined();
      expect(result.value.language).toBeUndefined();
    });

    it('should reject invalid page', () => {
      const query = { page: 0 };

      const result = validateListBookmarksQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/page/)
      ]));
    });

    it('should reject invalid limit', () => {
      const query = { limit: 150 }; // too high

      const result = validateListBookmarksQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/limit/)
      ]));
    });

    it('should reject non-integer page', () => {
      const query = { page: '1.5' };

      const result = validateListBookmarksQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/page/)
      ]));
    });

    it('should reject invalid language code', () => {
      const query = { language: 'xx' };

      const result = validateListBookmarksQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/language/)
      ]));
    });
  });

  describe('validateDeleteBookmarkParams', () => {
    it('should validate correct MongoDB ObjectId', () => {
      const params = { id: '507f1f77bcf86cd799439011' };

      const result = validateDeleteBookmarkParams(params);

      expect(result.valid).toBe(true);
      expect(result.value.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should reject invalid ObjectId', () => {
      const params = { id: 'not-a-mongo-id' };

      const result = validateDeleteBookmarkParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/id/)
      ]));
    });

    it('should reject missing id', () => {
      const params = {};

      const result = validateDeleteBookmarkParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/id/)
      ]));
    });
  });
});
