'use strict';

const { TAXONOMY, normalizeToTaxonomy } = require('../src/constants/categories');

describe('TAXONOMY', () => {
  it('includes all expected canonical labels', () => {
    expect(TAXONOMY).toEqual(
      expect.arrayContaining([
        'Tech', 'Politics', 'Sports', 'Business', 'World',
        'Health', 'Entertainment', 'Science', 'Education', 'General'
      ])
    );
  });

  it('contains no duplicate entries', () => {
    expect(new Set(TAXONOMY).size).toBe(TAXONOMY.length);
  });
});

describe('normalizeToTaxonomy — exact matches', () => {
  const canonicalCases = [
    'Tech', 'Politics', 'Sports', 'Business', 'World',
    'Health', 'Entertainment', 'Science', 'Education', 'General'
  ];

  canonicalCases.forEach((label) => {
    it(`passes "${label}" through unchanged`, () => {
      expect(normalizeToTaxonomy(label)).toBe(label);
    });

    it(`normalizes "${label.toUpperCase()}" to "${label}"`, () => {
      expect(normalizeToTaxonomy(label.toUpperCase())).toBe(label);
    });

    it(`normalizes "${label.toLowerCase()}" to "${label}"`, () => {
      expect(normalizeToTaxonomy(label.toLowerCase())).toBe(label);
    });
  });
});

describe('normalizeToTaxonomy — fallback keyword mapping', () => {
  const cases = [
    // Tech aliases
    ['technology', 'Tech'],
    ['Artificial Intelligence update', 'Tech'],
    ['machine learning breakthrough', 'Tech'],
    ['software development', 'Tech'],
    ['crypto news', 'Tech'],
    ['blockchain technology', 'Tech'],
    // Politics aliases
    ['political news', 'Politics'],
    ['government policy', 'Politics'],
    ['election results', 'Politics'],
    // Sports aliases
    ['cricket match', 'Sports'],
    ['football league', 'Sports'],
    ['olympics tournament', 'Sports'],
    ['sport highlights', 'Sports'],
    // Business aliases
    ['economy growth', 'Business'],
    ['stock market update', 'Business'],
    ['startup funding', 'Business'],
    ['financial results', 'Business'],
    // World aliases
    ['international diplomacy', 'World'],
    ['global conflict', 'World'],
    ['foreign affairs', 'World'],
    // Health aliases
    ['medical breakthrough', 'Health'],
    ['vaccine rollout', 'Health'],
    ['mental health awareness', 'Health'],
    ['wellness tips', 'Health'],
    // Entertainment aliases
    ['movie review', 'Entertainment'],
    ['celebrity gossip', 'Entertainment'],
    ['box office results', 'Entertainment'],
    ['music album release', 'Entertainment'],
    // Science aliases
    ['space exploration', 'Science'],
    ['climate change research', 'Science'],
    ['nasa mission', 'Science'],
    ['physics discovery', 'Science'],
    // Education aliases
    ['school curriculum', 'Education'],
    ['university scholarship', 'Education'],
    ['student exam results', 'Education']
  ];

  cases.forEach(([input, expected]) => {
    it(`maps "${input}" → "${expected}"`, () => {
      expect(normalizeToTaxonomy(input)).toBe(expected);
    });
  });
});

describe('normalizeToTaxonomy — unknown / empty inputs', () => {
  it('returns "General" for empty string', () => {
    expect(normalizeToTaxonomy('')).toBe('General');
  });

  it('returns "General" for null', () => {
    expect(normalizeToTaxonomy(null)).toBe('General');
  });

  it('returns "General" for undefined', () => {
    expect(normalizeToTaxonomy(undefined)).toBe('General');
  });

  it('returns "General" for whitespace-only string', () => {
    expect(normalizeToTaxonomy('   ')).toBe('General');
  });

  it('returns "General" for completely unrecognized label', () => {
    expect(normalizeToTaxonomy('Xyzzy42')).toBe('General');
  });

  it('returns "General" for random special characters', () => {
    expect(normalizeToTaxonomy('!!!$$$###')).toBe('General');
  });
});
