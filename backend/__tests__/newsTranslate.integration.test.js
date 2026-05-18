const request = require('supertest');

jest.mock('../src/services/newsIngestionService', () => ({
  fetchNewsCards: jest.fn(),
  translateStoryContent: jest.fn()
}));

jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  isDatabaseConnected: jest.fn().mockReturnValue(true),
  getConnection: jest.fn(() => ({ readyState: 1 }))
}));

const { translateStoryContent } = require('../src/services/newsIngestionService');
const { app } = require('../src/index');

describe('news translate integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid translate payload', async () => {
    const response = await request(app)
      .post('/api/v1/news/translate')
      .send({ title: 'Only title, no target language' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        message: 'Validation failed.'
      }
    });
    expect(translateStoryContent).not.toHaveBeenCalled();
  });

  it('returns translated content when service translates successfully', async () => {
    translateStoryContent.mockResolvedValue({
      translated: true,
      title: 'अनुवादित शीर्षक',
      summary: 'यह अनुवादित सारांश है।',
      language: 'hi',
      sourceLanguage: 'en',
      targetLanguage: 'hi',
      fallbackReason: null
    });

    const response = await request(app)
      .post('/api/v1/news/translate')
      .send({
        title: 'Translated title',
        summary: 'Translated summary',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      translated: true,
      state: 'translated',
      data: {
        title: 'अनुवादित शीर्षक',
        summary: 'यह अनुवादित सारांश है।',
        language: 'hi',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        fallbackReason: null
      }
    });
  });

  it('returns original state with fallback reason when translation is unavailable', async () => {
    translateStoryContent.mockResolvedValue({
      translated: false,
      title: 'Original title',
      summary: 'Original summary',
      language: 'en',
      sourceLanguage: 'en',
      targetLanguage: 'hi',
      fallbackReason: 'translation_unavailable'
    });

    const response = await request(app)
      .post('/api/v1/news/translate')
      .send({
        title: 'Original title',
        summary: 'Original summary',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      translated: false,
      state: 'original',
      data: {
        title: 'Original title',
        summary: 'Original summary',
        fallbackReason: 'translation_unavailable'
      }
    });
  });
});
