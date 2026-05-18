'use strict';

const {
  validateCardsQuery,
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