'use strict';

const { computeTitleFingerprint } = require('../src/utils/fingerprint');

describe('computeTitleFingerprint', () => {
  it('lowercases the input', () => {
    expect(computeTitleFingerprint('Breaking News')).toBe('breaking news');
  });

  it('strips punctuation and special characters', () => {
    expect(computeTitleFingerprint("India's GDP grows 7%!")).toBe('indias gdp grows 7');
  });

  it('collapses multiple spaces to one', () => {
    expect(computeTitleFingerprint('Hello   World')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(computeTitleFingerprint('  hello world  ')).toBe('hello world');
  });

  it('truncates to 120 characters', () => {
    const long = 'a'.repeat(200);
    expect(computeTitleFingerprint(long)).toHaveLength(120);
  });

  it('returns empty string for empty input', () => {
    expect(computeTitleFingerprint('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(computeTitleFingerprint(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(computeTitleFingerprint(undefined)).toBe('');
  });

  it('produces the same fingerprint for the same story from different sources', () => {
    // Slight punctuation/casing differences should not change the fingerprint
    const a = computeTitleFingerprint("India's GDP Grows by 7% in Q1!");
    const b = computeTitleFingerprint('indias gdp grows by 7 in q1');
    expect(a).toBe(b);
  });

  it('keeps digits', () => {
    expect(computeTitleFingerprint('Top 10 AI Tools')).toBe('top 10 ai tools');
  });

  it('handles unicode gracefully (strips non-ASCII)', () => {
    // Non-ASCII chars are removed since they don't match [a-z0-9\s]
    const result = computeTitleFingerprint('Café au lait');
    expect(result).toBe('caf au lait');
  });
});
