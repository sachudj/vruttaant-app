const cron = require('node-cron');
const { startNewsSyncJob, stopNewsSyncJob, runSyncCycle } = require('../src/jobs/newsSyncJob');
const { fetchNewsCards } = require('../src/services/newsIngestionService');
const NewsCard = require('../src/models/NewsCard');
const NewsSource = require('../src/models/NewsSource');
const { isDatabaseConnected } = require('../src/config/database');

jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

jest.mock('../src/services/newsIngestionService', () => ({
  fetchNewsCards: jest.fn()
}));

jest.mock('../src/models/NewsCard', () => ({
  find: jest.fn(),
  bulkWrite: jest.fn()
}));

jest.mock('../src/models/NewsSource', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

jest.mock('../src/config/database', () => ({
  isDatabaseConnected: jest.fn()
}));

describe('newsSyncJob', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stopNewsSyncJob();
  });

  describe('startNewsSyncJob / stopNewsSyncJob', () => {
    it('should schedule a cron job', () => {
      const mockTask = { stop: jest.fn() };
      cron.schedule.mockReturnValue(mockTask);

      startNewsSyncJob();

      expect(cron.schedule).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );
      
      stopNewsSyncJob();
      expect(mockTask.stop).toHaveBeenCalled();
    });

    it('should not schedule if DISABLE_NEWS_SYNC is true', () => {
      process.env.DISABLE_NEWS_SYNC = 'true';
      startNewsSyncJob();
      expect(cron.schedule).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('disabled via environment'));
      delete process.env.DISABLE_NEWS_SYNC;
    });
  });

  describe('runSyncCycle', () => {
    it('should skip if database is not connected', async () => {
      isDatabaseConnected.mockReturnValue(false);
      await runSyncCycle();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped sync cycle'));
      expect(fetchNewsCards).not.toHaveBeenCalled();
    });

    it('should run sync successfully when db is connected and cards are found', async () => {
      isDatabaseConnected.mockReturnValue(true);
      // Return sources from DB
      NewsSource.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { url: 'https://www.bbc.com/news',       language: 'en', maxItems: 20, name: 'BBC News' },
          { url: 'https://www.reuters.com/world/', language: 'en', maxItems: 20, name: 'Reuters' },
          { url: 'https://www.aljazeera.com/news/', language: 'en', maxItems: 20, name: 'Al Jazeera' }
        ])
      });
      NewsSource.findOneAndUpdate.mockResolvedValue(null);
      NewsSource.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });
      fetchNewsCards.mockResolvedValue({
        cards: [
          {
            title: 'Test',
            url: 'http://test.com',
            language: 'en',
            titleFingerprint: 'test-fingerprint'
          }
        ]
      });

      NewsCard.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });

      NewsCard.bulkWrite.mockResolvedValue({
        upsertedCount: 1,
        modifiedCount: 0
      });

      await runSyncCycle();

      expect(fetchNewsCards).toHaveBeenCalled();
      expect(NewsCard.bulkWrite).toHaveBeenCalledTimes(3); // 3 default sources
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Background sync cycle completed.'));
    });

    it('should handle errors gracefully during syncSource', async () => {
      isDatabaseConnected.mockReturnValue(true);
      NewsSource.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { url: 'https://www.bbc.com/news', language: 'en', maxItems: 20 }
        ])
      });
      NewsSource.findOneAndUpdate.mockResolvedValue(null);
      NewsSource.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });
      fetchNewsCards.mockRejectedValue(new Error('Network error'));

      await runSyncCycle();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync'),
        'Network error'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Background sync cycle completed.'));
    });
  });
});