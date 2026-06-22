const {
  normalizeLanguage,
  normalizeCategory,
  parseDate,
  resolveUrl,
  cleanText,
  validateCardQuality,
  toLanguageLabel,
  validateUrlForIngestion,
  fetchArticleSummary,
  isBoilerplateText,
  hasKeywordOverlap,
  isGenericOrLogoImage,
  truncateToSentences
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

  test('maps multi-word categories containing a taxonomy keyword', () => {
    // "world news" contains keyword "world" → canonical "World"
    expect(normalizeCategory('world news')).toBe('World');
  });

  test('defaults to General for empty input', () => {
    expect(normalizeCategory('')).toBe('General');
    expect(normalizeCategory(null)).toBe('General');
  });

  test('maps keyword-matching strings to taxonomy labels', () => {
    // "tech & science" matches "tech" keyword → "Tech"
    expect(normalizeCategory('tech & science')).toBe('Tech');
    // "artsculture" has no taxonomy keyword → General
    expect(normalizeCategory('arts@culture')).toBe('General');
  });

  test('maps strings containing taxonomy keywords regardless of surrounding chars', () => {
    // "food/lifestyle" and "mother-child" have no taxonomy keyword → General
    expect(normalizeCategory('food/lifestyle')).toBe('General');
    expect(normalizeCategory('mother-child')).toBe('General');
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

describe('newsIngestionService - Source Quality Rules', () => {
  test('passes card with valid title length, URL, and image URL', () => {
    const result = validateCardQuality({
      title: 'Metro expansion approved by city council after review',
      url: 'https://example.com/news/metro-expansion',
      imageUrl: 'https://example.com/images/metro.jpg'
    });

    expect(result).toEqual({ pass: true, reasons: [] });
  });

  test('fails card with short title', () => {
    const result = validateCardQuality({
      title: 'Short title',
      url: 'https://example.com/news/item',
      imageUrl: 'https://example.com/images/item.jpg'
    });

    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('title_length');
  });

  test('fails card with invalid URL', () => {
    const result = validateCardQuality({
      title: 'A sufficiently long title for this quality test case',
      url: 'notaurl',
      imageUrl: 'https://example.com/images/item.jpg'
    });

    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('invalid_url');
  });

  test('fails card with invalid image URL when image is present', () => {
    const result = validateCardQuality({
      title: 'A sufficiently long title for this quality test case',
      url: 'https://example.com/news/item',
      imageUrl: 'notaurl'
    });

    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('missing_image');
  });
});

describe('newsIngestionService - validateUrlForIngestion', () => {
  test('allows valid HTTP/HTTPS URLs', () => {
    expect(validateUrlForIngestion('https://example.com/news')).toBe('https://example.com/news');
    expect(validateUrlForIngestion('http://example.com/news')).toBe('http://example.com/news');
  });

  test('throws for invalid protocol', () => {
    expect(() => validateUrlForIngestion('ftp://example.com')).toThrow('Invalid URL protocol');
  });

  test('throws for malformed URL', () => {
    expect(() => validateUrlForIngestion('not-a-url')).toThrow('Invalid source URL');
  });

  test('throws for SSRF hostnames', () => {
    expect(() => validateUrlForIngestion('https://localhost/api')).toThrow('Requests to internal or private networks are not allowed.');
    expect(() => validateUrlForIngestion('https://127.0.0.1/api')).toThrow('Requests to internal or private networks are not allowed.');
    expect(() => validateUrlForIngestion('https://192.168.1.1/api')).toThrow('Requests to internal or private networks are not allowed.');
  });
});

describe('newsIngestionService - fetchArticleSummary', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('extracts summary from og:description', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><head><meta property="og:description" content="This is an awesome og:description metadata tag for the story." /></head><body></body></html>'
    });

    const summary = await fetchArticleSummary('https://example.com/story');
    expect(summary).toBe('This is an awesome og:description metadata tag for the story.');
  });

  test('extracts summary from name=description tag when og:description is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><head><meta name="description" content="This is a simple name description meta tag summary." /></head><body></body></html>'
    });

    const summary = await fetchArticleSummary('https://example.com/story');
    expect(summary).toBe('This is a simple name description meta tag summary.');
  });

  test('falls back to the first body paragraph matching length criteria', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html>
          <body>
            <article>
              <p>Short</p>
              <p>This is a sufficiently long first paragraph body text that we expect to be returned as a summary because it falls in the valid length bounds.</p>
            </article>
          </body>
        </html>
      `
    });

    const summary = await fetchArticleSummary('https://example.com/story');
    expect(summary).toBe('This is a sufficiently long first paragraph body text that we expect to be returned as a summary because it falls in the valid length bounds.');
  });

  test('returns empty string if fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false
    });

    const summary = await fetchArticleSummary('https://example.com/story');
    expect(summary).toBe('');
  });

  test('ignores boilerplate meta description and falls back to body paragraph', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html>
          <head>
            <meta property="og:description" content="Pune News Updates: Read Latest Pune News Headlines about Pune Education, Weather, Politics." />
          </head>
          <body>
            <p>To mitigate the potential impact of expected El Niño conditions, the Maharashtra government has intensified soil and water conservation projects across the state.</p>
          </body>
        </html>
      `
    });

    const summary = await fetchArticleSummary('https://example.com/story');
    expect(summary).toBe('To mitigate the potential impact of expected El Niño conditions, the Maharashtra government has intensified soil and water conservation projects across the state.');
  });

  test('ignores meta description that fails keyword overlap check and falls back', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html>
          <head>
            <meta property="og:description" content="This is a summary about standard football soccer leagues and cricket scores." />
          </head>
          <body>
            <p>To mitigate the potential impact of expected El Niño conditions, the Maharashtra government has intensified soil and water conservation projects across the state.</p>
          </body>
        </html>
      `
    });

    const summary = await fetchArticleSummary(
      'https://example.com/story',
      'El Niño: Maharashtra farmers urged to finish water conservation'
    );
    expect(summary).toBe('To mitigate the potential impact of expected El Niño conditions, the Maharashtra government has intensified soil and water conservation projects across the state.');
  });
});

describe('newsIngestionService - isBoilerplateText', () => {
  test('identifies empty or null text as boilerplate', () => {
    expect(isBoilerplateText('')).toBe(true);
    expect(isBoilerplateText(null)).toBe(true);
  });

  test('flags promotional or generic updates keywords', () => {
    expect(isBoilerplateText('Read latest news on our website.')).toBe(true);
    expect(isBoilerplateText('follow us on whatsapp for updates')).toBe(true);
    expect(isBoilerplateText('Catch all Live news updates on our page')).toBe(true);
  });

  test('flags multiple category names listing (keyword stuffing)', () => {
    expect(isBoilerplateText('Latest updates about Education, Weather, Politics, Crime')).toBe(true);
  });

  test('allows clean article descriptions', () => {
    expect(isBoilerplateText('To mitigate the potential impact of expected El Niño conditions, the Maharashtra government has intensified soil and water conservation projects.')).toBe(false);
  });
});

describe('newsIngestionService - hasKeywordOverlap', () => {
  test('returns false for empty title or summary', () => {
    expect(hasKeywordOverlap('', 'Summary')).toBe(false);
    expect(hasKeywordOverlap('Title', '')).toBe(false);
    expect(hasKeywordOverlap(null, null)).toBe(false);
  });

  test('returns true for title with only stopwords/short words (defaults pass)', () => {
    expect(hasKeywordOverlap('the in on', 'To mitigate the impact...')).toBe(true);
  });

  test('detects actual matching keywords case-insensitively', () => {
    expect(
      hasKeywordOverlap(
        'El Niño: Maharashtra farmers urged to finish water conservation',
        'Maharashtra government urges conservation efforts.'
      )
    ).toBe(true);
  });

  test('rejects totally unrelated texts (zero overlap)', () => {
    expect(
      hasKeywordOverlap(
        'El Niño: Maharashtra farmers urged to finish water conservation',
        'This is a completely unrelated summary discussing technology updates for the iPhone 17 lineup.'
      )
    ).toBe(false);
  });
});

describe('newsIngestionService - isGenericOrLogoImage', () => {
  test('returns true for null/empty and generic image URLs', () => {
    expect(isGenericOrLogoImage(null)).toBe(true);
    expect(isGenericOrLogoImage('')).toBe(true);
    expect(isGenericOrLogoImage('https://indianexpress.com/wp-content/plugins/ie-newsblock-builder/assets/images/default-ie.jpg')).toBe(true);
    expect(isGenericOrLogoImage('https://site.com/assets/logo.png')).toBe(true);
    expect(isGenericOrLogoImage('https://site.com/placeholders/brand-image.jpg')).toBe(true);
  });

  test('returns false for actual story image URLs', () => {
    expect(isGenericOrLogoImage('https://images.indianexpress.com/2026/05/LEGO-P1-ILLUUSTRATION.jpg')).toBe(false);
    expect(isGenericOrLogoImage('https://images.unsplash.com/photo-1495020689067-958852a7765e')).toBe(false);
  });
});

describe('newsIngestionService - truncateToSentences', () => {
  test('returns empty string for empty input', () => {
    expect(truncateToSentences('')).toBe('');
    expect(truncateToSentences(null)).toBe('');
  });

  test('returns original string if under word limit', () => {
    const text = 'This is a short sentence. It is well under the limit.';
    expect(truncateToSentences(text, 20)).toBe(text);
  });

  test('truncates to sentence boundary if over limit', () => {
    const text = 'This is the first sentence. This is the second sentence that contains many words to exceed the limit. This is the third sentence.';
    const result = truncateToSentences(text, 12);
    expect(result).toBe('This is the first sentence.');
  });
  
  test('truncates with ellipsis if no sentence boundary is found near the end of truncated chunk', () => {
    const text = 'Word '.repeat(30).trim();
    const result = truncateToSentences(text, 10);
    expect(result).toBe('Word Word Word Word Word Word Word Word Word Word...');
  });
});
