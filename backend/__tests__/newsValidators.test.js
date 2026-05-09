'use strict';

const { validateCardsQuery } = require('../src/validation/newsValidators');

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
    expect(result.errors).toContain('sort must be one of: latest, relevance.');
  });

  it('trims and clamps q length to 120 characters', () => {
    const longQuery = `  ${'a'.repeat(130)}  `;
    const result = validateCardsQuery({ q: longQuery });

    expect(result.valid).toBe(true);
    expect(result.value.q).toHaveLength(120);
  });
});