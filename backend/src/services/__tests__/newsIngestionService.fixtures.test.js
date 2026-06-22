const fs = require('fs');
const path = require('path');
const {
  fetchNewsCards,
  summarizeWithLlm
} = require('../newsIngestionService');
const {
  deterministicLlmResponses,
  createFetchOkJson,
  createFetchError
} = require('../../../__tests__/fixtures/llmResponses');

const sampleHtml = fs.readFileSync(
  path.join(__dirname, '../../../__tests__/fixtures/newsSource.sample.html'),
  'utf8'
);

describe('newsIngestionService fixtures and deterministic llm mocks', () => {
  const originalFetch = global.fetch;
  const originalLlmApiKey = process.env.LLM_API_KEY;
  const originalConsoleLog = console.log;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.LLM_API_KEY = originalLlmApiKey;
    console.log = originalConsoleLog;
    jest.restoreAllMocks();
  });

  it('summarizeWithLlm returns deterministic summary/category for valid JSON response', async () => {
    process.env.LLM_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue(
      createFetchOkJson(deterministicLlmResponses.validJson)
    );

    const result = await summarizeWithLlm(
      {
        title: 'Metro expansion approved by city council',
        summary: 'A transit plan was approved by city officials.',
        source: 'City Times',
        url: 'https://example.com/news/metro-expansion'
      },
      'en'
    );

    expect(result.category).toBe('Business');
    expect(result.aiSummary).toContain(
      'Public transit expansion moves forward with budget controls and staged delivery milestones.'
    );
    expect(result.aiSummary).toContain(
      'Metro expansion approved by city council A transit plan was approved by city officials.'
    );
  });

  it('summarizeWithLlm falls back predictably when model content is not JSON', async () => {
    process.env.LLM_API_KEY = 'test-key';
    const logSpy = jest.fn();
    console.log = logSpy;
    global.fetch = jest.fn().mockResolvedValue(
      createFetchOkJson(deterministicLlmResponses.plainText)
    );

    const result = await summarizeWithLlm(
      {
        title: 'Startup raises funding',
        summary: 'Funding round announced',
        source: 'Tech Daily',
        url: 'https://example.com/news/climate-analytics'
      },
      'en'
    );

    expect(result.category).toBe('General');
    expect(result.aiSummary).toContain(
      'This is plain text from the model and not valid JSON.'
    );
    expect(result.aiSummary).toContain('Startup raises funding Funding round announced');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('llm_summary_category_invalid_json')
    );
  });

  it('summarizeWithLlm returns defaults on provider error response', async () => {
    process.env.LLM_API_KEY = 'test-key';
    const logSpy = jest.fn();
    console.log = logSpy;
    global.fetch = jest.fn().mockResolvedValue(createFetchError(503));

    const result = await summarizeWithLlm(
      {
        title: 'Title',
        summary: 'Summary',
        source: 'Source',
        url: 'https://example.com/news/item'
      },
      'en'
    );

    expect(result).toEqual({
      aiSummary: '',
      category: 'General'
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('llm_summary_category_provider_error')
    );
  });

  it('fetchNewsCards parses deterministic article fixture data', async () => {
    delete process.env.LLM_API_KEY;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => sampleHtml
    });

    const result = await fetchNewsCards('https://example.com/news', 'english', 10);

    expect(result.sourceUrl).toBe('https://example.com/news');
    expect(result.language).toBe('en');
    expect(result.totalFound).toBe(2);
    expect(result.cards).toHaveLength(2);

    expect(result.cards[0]).toMatchObject({
      title: 'Metro expansion approved by city council',
      source: 'City Times',
      url: 'https://example.com/news/metro-expansion',
      language: 'en',
      aiSummary: '',
      category: 'General'
    });

    expect(result.cards[1]).toMatchObject({
      title: 'Startup raises funding for climate analytics',
      source: 'Tech Daily',
      url: 'https://example.com/news/climate-analytics',
      language: 'en'
    });
  });

  it('fetchNewsCards filters out cards that fail title/url quality rules', async () => {
    delete process.env.LLM_API_KEY;

    const qualityFixtureHtml = `
      <html><body>
        <article>
          <h2>Short title</h2>
          <a href="/news/short">Read</a>
          <img src="/images/short.jpg" />
        </article>
        <article>
          <h2>This is a sufficiently long title but has no image url</h2>
          <a href="/news/no-image">Read</a>
        </article>
        <article>
          <h2>This is a sufficiently long title with valid url and image</h2>
          <a href="/news/valid">Read</a>
          <img src="/images/valid.jpg" />
        </article>
      </body></html>
    `;

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/news/no-image')) {
        return Promise.resolve({
          ok: true,
          text: async () => '<html><body><div class="story-body"><p>This is a valid long description without any image tags.</p></div></body></html>'
        });
      }
      return Promise.resolve({
        ok: true,
        text: async () => qualityFixtureHtml
      });
    });

    const result = await fetchNewsCards('https://example.com/news', 'en', 10);

    expect(result.totalFound).toBe(2);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].title).toBe('This is a sufficiently long title but has no image url');
    expect(result.cards[0].url).toBe('https://example.com/news/no-image');
    expect(result.cards[0].imageUrl).toBe('');
    expect(result.cards[1].title).toBe('This is a sufficiently long title with valid url and image');
    expect(result.cards[1].url).toBe('https://example.com/news/valid');
    expect(result.cards[1].imageUrl).toBe('https://example.com/images/valid.jpg');
  });

  it('fetchNewsCards logs enrichment failure and falls back when llm call throws', async () => {
    process.env.LLM_API_KEY = 'test-key';
    const logSpy = jest.fn();
    console.log = logSpy;

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => sampleHtml
      })
      .mockRejectedValueOnce(new Error('LLM network down'))
      .mockResolvedValueOnce(createFetchOkJson(deterministicLlmResponses.validJson));

    const result = await fetchNewsCards('https://example.com/news', 'en', 2);

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].aiSummary).toBe('');
    expect(result.cards[0].category).toBe('General');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('llm_summary_category_enrichment_failed')
    );
  });
});
