'use strict';

jest.mock('../src/services/cohortService');

const cohortService = require('../src/services/cohortService');
const {
  getUserCohorts,
  refreshUserCohorts,
  getCohortStats,
  getCohortUsers
} = require('../src/controllers/cohortController');

function makeReq(overrides = {}) {
  return { user: { id: 'uid1' }, params: {}, query: {}, id: 'test-req-id', ...overrides };
}
function makeRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return res;
}
const next = jest.fn();

const MOCK_COHORTS = [
  { cohortId: 'language_en', cohortType: 'language' },
  { cohortId: 'device_ios', cohortType: 'device' }
];

describe('cohortController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getUserCohorts ───────────────────────────────────────────────────────────
  describe('getUserCohorts', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req = makeReq({ user: null });
      const res = makeRes();
      await getUserCohorts(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 200 with cohort list', async () => {
      cohortService.getUserCohorts.mockResolvedValue(MOCK_COHORTS);
      const req = makeReq();
      const res = makeRes();
      await getUserCohorts(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { cohorts: MOCK_COHORTS, total: 2 } })
      );
    });

    it('passes errors to next', async () => {
      cohortService.getUserCohorts.mockRejectedValue(new Error('DB error'));
      await getUserCohorts(makeReq(), makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── refreshUserCohorts ───────────────────────────────────────────────────────
  describe('refreshUserCohorts', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req = makeReq({ user: null });
      const res = makeRes();
      await refreshUserCohorts(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 200 with refreshed cohort list', async () => {
      cohortService.assignUserToCohorts.mockResolvedValue(MOCK_COHORTS);
      const req = makeReq();
      const res = makeRes();
      await refreshUserCohorts(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cohort assignments refreshed',
          data: { cohorts: MOCK_COHORTS, total: 2 }
        })
      );
    });

    it('passes errors to next', async () => {
      cohortService.assignUserToCohorts.mockRejectedValue(new Error('fail'));
      await refreshUserCohorts(makeReq(), makeRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ── getCohortStats ───────────────────────────────────────────────────────────
  describe('getCohortStats', () => {
    it('returns 200 with aggregate stats', async () => {
      const stats = [
        { cohortId: 'language_en', cohortType: 'language', userCount: 100 }
      ];
      cohortService.getCohortStats.mockResolvedValue(stats);
      const req = makeReq();
      const res = makeRes();
      await getCohortStats(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { cohorts: stats, total: 1 } })
      );
    });

    it('passes errors to next', async () => {
      cohortService.getCohortStats.mockRejectedValue(new Error('agg fail'));
      await getCohortStats(makeReq(), makeRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ── getCohortUsers ───────────────────────────────────────────────────────────
  describe('getCohortUsers', () => {
    it('returns 200 with paginated cohort users', async () => {
      const mockResult = {
        cohortId: 'language_en',
        users: [{ userId: 'uid1' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      cohortService.getCohortUsers.mockResolvedValue(mockResult);
      const req = makeReq({ params: { cohortId: 'language_en' }, query: { page: '1', limit: '20' } });
      const res = makeRes();
      await getCohortUsers(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockResult })
      );
      expect(cohortService.getCohortUsers).toHaveBeenCalledWith('language_en', 1, 20);
    });

    it('clamps limit to 100', async () => {
      cohortService.getCohortUsers.mockResolvedValue({ cohortId: 'x', users: [], total: 0, page: 1, limit: 100, totalPages: 0 });
      const req = makeReq({ params: { cohortId: 'x' }, query: { limit: '9999' } });
      await getCohortUsers(req, makeRes(), next);
      expect(cohortService.getCohortUsers).toHaveBeenCalledWith('x', 1, 100);
    });

    it('defaults to page=1, limit=20 when query is absent', async () => {
      cohortService.getCohortUsers.mockResolvedValue({ cohortId: 'x', users: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      const req = makeReq({ params: { cohortId: 'x' }, query: {} });
      await getCohortUsers(req, makeRes(), next);
      expect(cohortService.getCohortUsers).toHaveBeenCalledWith('x', 1, 20);
    });

    it('passes errors to next', async () => {
      cohortService.getCohortUsers.mockRejectedValue(new Error('not found'));
      await getCohortUsers(makeReq({ params: { cohortId: 'x' }, query: {} }), makeRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
