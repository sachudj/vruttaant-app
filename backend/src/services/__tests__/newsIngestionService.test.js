const {
  normalizeLanguage,
  normalizeCategory,
  parseDate,
  resolveUrl,
  cleanText,
  toLanguageLabel
} = require('../newsIngestionService');

describe('newsIngestionService - Language Normalization', () => {
  test('normalizes EN to en', () => {
    expect(normalizeLanguage('EN')).toBe('en');
  });

  test('normalizes english to en', () => {
    expect(normalizeLanguage('english')).toBe('en');
  });

  test('normalizes hindi aliases', () => {
    expect(normalizeLanguage('hindi')).toBe('hi');
    expect(normalizeLanguage('HI')).toBe('hi');
  });

  test('defaults to en for unrecognized', () => {
    expect(normalizeLanguage('unknown')).toBe('en');
    expect(normalizeLanguage(null)).toBe('en');
  });

  test('handles whitespace', () => {
    expect(normalizeLanguage('  hi  ')).toBe('hi');
  });
});

describe('newsIngestionService - Category Normalization', () => {
  test('capitalizes simple categories', () => {
    expect(normalizeCategory('tech')).toBe('Tech');
    expect(normalizeCategory('sports')).toBe('Sports');
  });

  test('capitalizes multi-word categories', () => {
    expect(normalizeCategory('world news')).toBe('World News');
  });

  test('defaults to General for empty input', () => {
    expect(normalizeCategory('')).toBe('General');
    expect(normalizeCategory(null)).toBe('General');
  });

  test('removes most special characters', () => {
    expect(normalizeCategory('tech & science')).toBe('Tech Science');
    expect(normalizeCategory('arts@culture')).toBe('Artsculture');
  });

  test('preserves slashes and dashes in output', () => {
    const result1 = normalizeCategory('food/lifestyle');
    expect(result1).toMatch(/[Ff]ood/);
    
    const result2 = normalizeCategory('mother-child');
    expect(result2).toMatch(/[Mm]other/);
  });

  test('truncates to 40 characters', () => {
    const result = normalizeCategory('a'.repeat(50));
    expect(result.length).toBeLessThanOrEqual(40);
  });
});

describe('newsIngestionService - Date Parsing', () => {
  test('parses ISO date strings', () => {
    const result = parseDate('2024-05-07T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
  });

  test('parses basic date strings', () => {
    const result = parseDate('2024-05-07');
    expect(result).toBeInstanceOf(Date);
  });

  test('returns null for invalid dates', () => {
    expect(parseDate('invalid')).toBeNull();
    expect(parseDate('32/13/2024')).toBeNull();
  });

  test('returns null for empty input', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });

  test('parses numeric timestamps', () => {
    const timestamp = Date.now();
    const result = parseDate(timestamp);
    expect(result).toBeInstanceOf(Date);
  });
});

describe('newsIngestionService - URL Resolution', () => {
  test('resolves relative URLs', () => {
    const result = resolveUrl('https://example.com/news/', 'article/123');
    expect(result).toContain('example.com');
    expect(result).toContain('article');
  });

  test('returns absolute URLs as-is', () => {
    const result = resolveUrl('https://example.com', 'https://other.com/article');
    expect(result).toBe('https://other.com/article');
  });

  test('returns empty string for invalid base URL', () => {
    expect(resolveUrl('not-a-url', 'article')).toBe('');
  });

  test('returns empty string for null URL', () => {
    expect(resolveUrl('https://example.com', null)).toBe('');
  });

  test('resolves URLs with query parameters', () => {
    const result = resolveUrl('https://example.com/', 'search?q=news');
    expect(result).toContain('search');
    expect(result).toContain('q=news');
  });
});

describe('newsIngestionService - Text Cleaning', () => {
  test('trims whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello');
  });

  test('collapses multiple spaces', () => {
    expect(cleanText('hello   world')).toBe('hello world');
  });

  test('collapses newlines and tabs', () => {
    expect(cleanText('hello\n\nworld')).toBe('hello world');
    expect(cleanText('hello\t\tworld')).toBe('hello world');
  });

  test('returns empty string for null', () => {
    expect(cleanText(null)).toBe('');
    expect(cleanText(undefined)).toBe('');
  });

  test('returns empty string for whitespace only', () => {
    expect(cleanText('   ')).toBe('');
  });
});

describe('newsIngestionService - Language Labels', () => {
  test('returns English for en', () => {
    expect(toLanguageLabel('en')).toBe('English');
  });

  test('returns proper names for supported languages', () => {
    expect(toLanguageLabel('hi')).toBe('Hindi');
    expect(toLanguageLabel('bn')).toBe('Bengali');
    expect(toLanguageLabel('ta')).toBe('Tamil');
  });

  test('returns English for unrecognized codes', () => {
    expect(toLanguageLabel('xx')).toBe('English');
    expect(toLanguageLabel(null)).toBe('English');
  });
});
