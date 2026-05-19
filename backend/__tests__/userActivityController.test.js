'use strict';

jest.mock('../src/services/userActivityService');

const userActivityService = require('../src/services/userActivityService');
const { getActivityHistory, getReadingFeed, getActivityStats } = require('../src/controllers/userController');

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeReq(query = {}) {
  return { user: { id: 'uid1' }, query, id: 'req-id' };
}
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const next = jest.fn();

// ─── getActivityHistory ───────────────────────────────────────────────────────
describe('userController.getActivityHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with activity data', async () => {
    const mockResult = {
      activities: [{ _id: 'e1', eventType: 'view' }],
      page: 1,
      limit: 20,
      totalCount: 1,
      totalPages: 1,
      hasMore: false
    };
    userActivityService.getUserActivityHistory.mockResolvedValue(mockResult);

    const res = makeRes();
    await getActivityHistory(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ activities: mockResult.activities }) })
    );
  });

  it('passes query filters to the service', async () => {
    userActivityService.getUserActivityHistory.mockResolvedValue({
      activities: [], page: 1, limit: 10, totalCount: 0, totalPages: 0, hasMore: false
    });

    await getActivityHistory(
      makeReq({ page: '2', limit: '10', eventType: 'bookmark', language: 'hi', category: 'Tech', startDate: '2026-01-01', endDate: '2026-01-31' }),
      makeRes(),
      next
    );

    expect(userActivityService.getUserActivityHistory).toHaveBeenCalledWith(
      'uid1', '2', '10',
      expect.objectContaining({ eventType: 'bookmark', language: 'hi', category: 'Tech', startDate: '2026-01-01', endDate: '2026-01-31' })
    );
  });

  it('does not add filters for absent query params', async () => {
    userActivityService.getUserActivityHistory.mockResolvedValue({
      activities: [], page: 1, limit: 20, totalCount: 0, totalPages: 0, hasMore: false
    });

    await getActivityHistory(makeReq({}), makeRes(), next);

    expect(userActivityService.getUserActivityHistory).toHaveBeenCalledWith(
      'uid1', undefined, undefined, {}
    );
  });

  it('calls next on service error', async () => {
    userActivityService.getUserActivityHistory.mockRejectedValue(new Error('DB error'));
    await getActivityHistory(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── getReadingFeed ───────────────────────────────────────────────────────────
describe('userController.getReadingFeed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with reading events', async () => {
    const events = [{ _id: 'e1', eventType: 'view' }];
    userActivityService.getReadingFeed.mockResolvedValue(events);

    const res = makeRes();
    await getReadingFeed(makeReq({ limit: '10' }), res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { readingEvents: events } })
    );
    expect(userActivityService.getReadingFeed).toHaveBeenCalledWith('uid1', '10');
  });

  it('calls next on service error', async () => {
    userActivityService.getReadingFeed.mockRejectedValue(new Error('fail'));
    await getReadingFeed(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── getActivityStats ─────────────────────────────────────────────────────────
describe('userController.getActivityStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with stats data', async () => {
    const stats = { totalViews: 5, totalBookmarks: 2, topCategories: [] };
    userActivityService.getUserActivityStats.mockResolvedValue(stats);

    const res = makeRes();
    await getActivityStats(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: stats })
    );
  });

  it('calls next on service error', async () => {
    userActivityService.getUserActivityStats.mockRejectedValue(new Error('agg fail'));
    await getActivityStats(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
