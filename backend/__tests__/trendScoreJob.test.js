const { computeTrendScore, runTrendScoreUpdate, startTrendScoreJob, stopTrendScoreJob } = require('../src/jobs/trendScoreJob');
const NewsCard = require('../src/models/NewsCard');
const { isDatabaseConnected } = require('../src/config/database');

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() }))
}));

jest.mock('../src/models/NewsCard', () => ({
  find: jest.fn(),
  bulkWrite: jest.fn()
}));

jest.mock('../src/config/database', () => ({
  isDatabaseConnected: jest.fn()
}));

describe('trendScoreJob', () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    stopTrendScoreJob();
  });

  describe('computeTrendScore', () => {
    it('returns a positive score for a fresh card', () => {
      const score = computeTrendScore(5, new Date());
      expect(score).toBeGreaterThan(0);
    });

    it('produces a lower score for older cards', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now - 2 * 3_600_000);
      const twentyHoursAgo = new Date(now - 20 * 3_600_000);

      const scoreNew = computeTrendScore(5, twoHoursAgo);
      const scoreOld = computeTrendScore(5, twentyHoursAgo);

      expect(scoreNew).toBeGreaterThan(scoreOld);
    });

    it('produces a higher score for cards seen more often', () => {
      const scrapedAt = new Date(Date.now() - 3 * 3_600_000);
      const scoreLow = computeTrendScore(1, scrapedAt);
      const scoreHigh = computeTrendScore(10, scrapedAt);

      expect(scoreHigh).toBeGreaterThan(scoreLow);
    });

    it('handles null ingestCount by defaulting to 1', () => {
      const score = computeTrendScore(null, new Date());
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('runTrendScoreUpdate', () => {
    it('skips when database is not connected', async () => {
      isDatabaseConnected.mockReturnValue(false);
      await runTrendScoreUpdate();
      expect(NewsCard.find).not.toHaveBeenCalled();
    });

    it('skips when no cards are found in the window', async () => {
      isDatabaseConnected.mockReturnValue(true);
      NewsCard.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      await runTrendScoreUpdate();
      expect(NewsCard.bulkWrite).not.toHaveBeenCalled();
    });

    it('bulk-updates trendScore for recent cards', async () => {
      isDatabaseConnected.mockReturnValue(true);
      const mockCards = [
        { _id: 'id1', ingestCount: 3, scrapedAt: new Date(Date.now() - 2 * 3_600_000) },
        { _id: 'id2', ingestCount: 1, scrapedAt: new Date(Date.now() - 10 * 3_600_000) }
      ];
      NewsCard.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockCards) });
      NewsCard.bulkWrite.mockResolvedValue({ modifiedCount: 2 });

      await runTrendScoreUpdate();

      expect(NewsCard.bulkWrite).toHaveBeenCalledTimes(1);
      const ops = NewsCard.bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(2);
      ops.forEach((op) => {
        expect(op.updateOne.update.$set.trendScore).toBeGreaterThan(0);
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated trend scores for 2 cards')
      );
    });
  });

  describe('startTrendScoreJob / stopTrendScoreJob', () => {
    it('schedules a cron job', () => {
      const cron = require('node-cron');
      startTrendScoreJob();
      expect(cron.schedule).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );
    });

    it('does not schedule when DISABLE_TREND_SCORE=true', () => {
      const cron = require('node-cron');
      process.env.DISABLE_TREND_SCORE = 'true';
      startTrendScoreJob();
      expect(cron.schedule).not.toHaveBeenCalled();
      delete process.env.DISABLE_TREND_SCORE;
    });
  });
});
