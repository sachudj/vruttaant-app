'use strict';

const {
  validateCardsQuery,
  validateRecommendedQuery,
  validateTranslatePayload
} = require('../src/validation/newsValidators');

describe('validateCardsQuery', () => {
  it('accepts default query values', () => {
    const result = validateCardsQuery({});

    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      language: 'en',
      page: 1,
      limit: 20,
      category: undefined,
      q: undefined,
      sort: 'latest'
    });
  });

  it('accepts relevance sort when q is provided', () => {
    const result = validateCardsQuery({
      language: 'english',
      q: 'economy growth',
      sort: 'relevance',
      page: '2',
      limit: '10'
    });

    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      language: 'en',
      page: 2,
      limit: 10,
      category: undefined,
      q: 'economy growth',
      sort: 'relevance'
    });
  });

  it('rejects unsupported sort values', () => {
    const result = validateCardsQuery({ sort: 'oldest' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('sort must be one of: latest, relevance, trending.');
  });

  it('trims and clamps q length to 120 characters', () => {
    const longQuery = `  ${'a'.repeat(130)}  `;
    const result = validateCardsQuery({ q: longQuery });

    expect(result.valid).toBe(true);
    expect(result.value.q).toHaveLength(120);
  });
});

describe('validateTranslatePayload', () => {
  it('accepts title and summary with normalized language fields', () => {
    const result = validateTranslatePayload({
      title: 'Major policy update announced',
      summary: 'The government announced a new policy today.',
      sourceLanguage: 'ENGLISH',
      targetLanguage: 'Hindi',
      url: 'https://example.com/story'
    });

    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      title: 'Major policy update announced',
      summary: 'The government announced a new policy today.',
      source: '',
      url: 'https://example.com/story',
      sourceLanguage: 'en',
      targetLanguage: 'hi'
    });
  });

  it('rejects payload when targetLanguage is missing', () => {
    const result = validateTranslatePayload({
      title: 'Story title'
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('targetLanguage is required.');
  });

  it('rejects payload when both title and summary are empty', () => {
    const result = validateTranslatePayload({
      targetLanguage: 'hi'
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title or summary is required.');
  });

  it('rejects invalid url when provided', () => {
    const result = validateTranslatePayload({
      title: 'Story title',
      targetLanguage: 'hi',
      url: 'not-a-url'
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('url must be a valid absolute URL.');
  });
});

describe('validateRecommendedQuery', () => {
  it('accepts default query values', () => {
    const result = validateRecommendedQuery({});

    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      language: 'en',
      page: 1,
      limit: 20,
      recentlyShown: undefined
    });
  });

  it('normalizes language and pagination parameters', () => {
    const result = validateRecommendedQuery({
      language: 'HINDI',
      page: '3',
      limit: '50'
    });

    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      language: 'hi',
      page: 3,
      limit: 50,
      recentlyShown: undefined
    });
  });

  it('clamps limit to max 100', () => {
    const result = validateRecommendedQuery({ limit: '200' });

    expect(result.valid).toBe(true);
    expect(result.value.limit).toBe(100);
  });

  it('accepts recentlyShown in format "category:count,category:count"', () => {
    const result = validateRecommendedQuery({
      recentlyShown: 'Tech:2,Science:1'
    });

    expect(result.valid).toBe(true);
    expect(result.value.recentlyShown).toBe('Tech:2,Science:1');
  });

  it('accepts recentlyShown with spaces', () => {
    const result = validateRecommendedQuery({
      recentlyShown: 'Tech: 2, Science: 1'
    });

    expect(result.valid).toBe(true);
    expect(result.value.recentlyShown).toBe('Tech: 2, Science: 1');
  });

  it('rejects invalid recentlyShown format with special characters', () => {
    const result = validateRecommendedQuery({
      recentlyShown: 'Tech:2@Science:1'
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('recentlyShown format must be "category:count,category2:count2".');
  });

  it('rejects non-numeric page value', () => {
    const result = validateRecommendedQuery({ page: 'abc' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('page must be a number.');
  });

  it('rejects non-numeric limit value', () => {
    const result = validateRecommendedQuery({ limit: 'xyz' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('limit must be a number.');
  });
});