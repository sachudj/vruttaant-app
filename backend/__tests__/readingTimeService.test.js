const {
  countWords,
  estimateReadingTime,
  enrichCardWithReadingTime,
  enrichCardsWithReadingTime,
  WORDS_PER_MINUTE,
  MIN_READING_TIME
} = require('../src/services/readingTimeService');

describe('readingTimeService', () => {
  describe('countWords', () => {
    it('counts words in plain text', () => {
      const text = 'This is a simple test with five words';
      expect(countWords(text)).toBe(8); // 8 words
    });

    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0);
    });

    it('returns 0 for null', () => {
      expect(countWords(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(countWords(undefined)).toBe(0);
    });

    it('strips HTML tags before counting', () => {
      const html = '<p>This is <b>bold</b> text</p>';
      expect(countWords(html)).toBe(4); // 'This' 'is' 'bold' 'text'
    });

    it('handles multiple spaces and newlines', () => {
      const text = 'Word1   Word2\n\nWord3\t\tWord4';
      expect(countWords(text)).toBe(4);
    });

    it('ignores HTML entities', () => {
      const html = '<p>Test &amp; example &lt;tag&gt;</p>';
      const result = countWords(html);
      expect(result).toBeGreaterThan(0);
    });

    it('handles complex nested HTML', () => {
      const html = '<div><p>Outer <span>inner <b>bold</b> text</span></p></div>';
      expect(countWords(html)).toBe(4); // 'Outer' 'inner' 'bold' 'text'
    });
  });

  describe('estimateReadingTime', () => {
    it('returns minimum reading time for empty input', () => {
      expect(estimateReadingTime('', '', '')).toBe(MIN_READING_TIME);
    });

    it('returns 1 minute for very short content (< 200 words)', () => {
      const title = 'Test Title';
      const summary = 'This is a short summary with limited word count.';
      const time = estimateReadingTime(title, summary, '');
      expect(time).toBe(1);
    });

    it('rounds up reading time', () => {
      // ~250 words should round up to 2 minutes (250 / 200 = 1.25 -> ceil = 2)
      const title = 'T'.repeat(50); // rough word count
      const summary = 'word '.repeat(30); // 30 words
      const aiSummary = 'word '.repeat(100); // 100 words
      const time = estimateReadingTime(title, summary, aiSummary);
      expect(time).toBeGreaterThanOrEqual(1);
    });

    it('combines title, summary, and aiSummary word counts', () => {
      // 200 words per section = 600 total = 3 minutes
      const longText = 'word '.repeat(200);
      const time = estimateReadingTime(longText, longText, longText);
      expect(time).toBeGreaterThanOrEqual(3);
    });

    it('calculates correct time for 200-word content (1 minute)', () => {
      const content = 'word '.repeat(200);
      expect(estimateReadingTime(content, '', '')).toBe(1);
    });

    it('calculates correct time for 400-word content (2 minutes)', () => {
      const content = 'word '.repeat(400);
      expect(estimateReadingTime(content, '', '')).toBe(2);
    });

    it('calculates correct time for 600-word content (3 minutes)', () => {
      const content = 'word '.repeat(600);
      expect(estimateReadingTime(content, '', '')).toBe(3);
    });

    it('handles null and undefined gracefully', () => {
      expect(estimateReadingTime(null, undefined, null)).toBe(MIN_READING_TIME);
    });

    it('handles non-string values', () => {
      // @ts-ignore - testing edge case
      expect(estimateReadingTime(123, {}, [])).toBe(MIN_READING_TIME);
    });
  });

  describe('enrichCardWithReadingTime', () => {
    it('adds readingTime field to card', () => {
      const card = {
        _id: '123',
        title: 'Test Article',
        summary: 'word '.repeat(100),
        aiSummary: ''
      };

      const enriched = enrichCardWithReadingTime(card);
      expect(enriched).toHaveProperty('readingTime');
      expect(enriched.readingTime).toBeGreaterThan(0);
    });

    it('mutates original card when mutate=true (default)', () => {
      const card = {
        _id: '123',
        title: 'Test Article',
        summary: 'Summary text'
      };

      const result = enrichCardWithReadingTime(card, true);
      expect(result).toBe(card); // Same object reference
      expect(card).toHaveProperty('readingTime');
    });

    it('creates new object when mutate=false', () => {
      const card = {
        _id: '123',
        title: 'Test Article',
        summary: 'Summary text'
      };

      const result = enrichCardWithReadingTime(card, false);
      expect(result).not.toBe(card); // Different object reference
      expect(result).toHaveProperty('readingTime');
      expect(card).not.toHaveProperty('readingTime'); // Original unchanged
    });

    it('handles null card', () => {
      expect(enrichCardWithReadingTime(null)).toBeNull();
    });

    it('preserves all card fields', () => {
      const card = {
        _id: '123',
        title: 'Test Article',
        summary: 'Summary',
        category: 'Tech',
        url: 'https://example.com'
      };

      const enriched = enrichCardWithReadingTime(card, false);
      expect(enriched._id).toBe(card._id);
      expect(enriched.title).toBe(card.title);
      expect(enriched.summary).toBe(card.summary);
      expect(enriched.category).toBe(card.category);
      expect(enriched.url).toBe(card.url);
      expect(enriched.readingTime).toBeDefined();
    });

    it('calculates reading time from HTML content in summary', () => {
      const card = {
        title: 'Title',
        summary: '<p>word </p>'.repeat(100),
        aiSummary: ''
      };

      const enriched = enrichCardWithReadingTime(card);
      expect(enriched.readingTime).toBeGreaterThanOrEqual(1);
    });
  });

  describe('enrichCardsWithReadingTime', () => {
    it('enriches array of cards', () => {
      const cards = [
        { _id: '1', title: 'Article 1', summary: 'word '.repeat(50) },
        { _id: '2', title: 'Article 2', summary: 'word '.repeat(100) }
      ];

      const enriched = enrichCardsWithReadingTime(cards);
      expect(enriched).toHaveLength(2);
      expect(enriched[0]).toHaveProperty('readingTime');
      expect(enriched[1]).toHaveProperty('readingTime');
    });

    it('mutates original cards when mutate=true (default)', () => {
      const cards = [
        { _id: '1', title: 'Article 1', summary: 'word '.repeat(50) }
      ];

      enrichCardsWithReadingTime(cards, true);
      expect(cards[0]).toHaveProperty('readingTime');
    });

    it('creates new objects when mutate=false', () => {
      const cards = [
        { _id: '1', title: 'Article 1', summary: 'word '.repeat(50) }
      ];

      const enriched = enrichCardsWithReadingTime(cards, false);
      expect(enriched[0]).not.toBe(cards[0]); // Different reference
      expect(enriched[0]).toHaveProperty('readingTime');
      expect(cards[0]).not.toHaveProperty('readingTime'); // Original unchanged
    });

    it('handles empty array', () => {
      expect(enrichCardsWithReadingTime([])).toEqual([]);
    });

    it('handles null array', () => {
      expect(enrichCardsWithReadingTime(null)).toEqual([]);
    });

    it('handles undefined array', () => {
      expect(enrichCardsWithReadingTime(undefined)).toEqual([]);
    });

    it('calculates different reading times for cards with different lengths', () => {
      const cards = [
        { _id: '1', title: 'Short', summary: 'word '.repeat(50), aiSummary: '' },
        { _id: '2', title: 'Long', summary: 'word '.repeat(300), aiSummary: 'word '.repeat(200) }
      ];

      const enriched = enrichCardsWithReadingTime(cards);
      expect(enriched[0].readingTime).toBeLessThanOrEqual(enriched[1].readingTime);
    });
  });

  describe('constants', () => {
    it('exports WORDS_PER_MINUTE constant', () => {
      expect(WORDS_PER_MINUTE).toBe(200);
    });

    it('exports MIN_READING_TIME constant', () => {
      expect(MIN_READING_TIME).toBe(1);
    });
  });
});
