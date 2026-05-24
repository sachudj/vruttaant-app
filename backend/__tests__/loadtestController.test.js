const {
  createLoadTestRun,
  getLoadTestHistory,
  getLoadTestTrends
} = require('../src/controllers/loadtestController');
const LoadTestRun = require('../src/models/LoadTestRun');

jest.mock('../src/models/LoadTestRun');
jest.mock('../src/health/readiness', () => ({
  isDatabaseConnected: jest.fn(() => true)
}));

describe('loadtestController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('createLoadTestRun', () => {
    it('stores a load-test run', async () => {
      req.body = {
        environment: 'staging',
        baseUrl: 'http://localhost:5001',
        durationSeconds: 20,
        connections: 4,
        overallRate: 3,
        scenarios: [],
        summary: { totalChecks: 6, passedChecks: 6, failedChecks: 0 }
      };

      LoadTestRun.create.mockResolvedValue({
        _id: 'run-1',
        environment: 'staging',
        capturedAt: new Date('2026-05-24T00:00:00.000Z')
      });

      await createLoadTestRun(req, res, next);

      expect(LoadTestRun.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          runId: 'run-1',
          environment: 'staging'
        })
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid payload', async () => {
      req.body = { environment: 'local' };

      await createLoadTestRun(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('getLoadTestHistory', () => {
    it('returns recent history list', async () => {
      const mockRuns = [{ environment: 'local', summary: { failedChecks: 0 } }];
      const lean = jest.fn().mockResolvedValue(mockRuns);
      const select = jest.fn().mockReturnValue({ lean });
      const limit = jest.fn().mockReturnValue({ select });
      const sort = jest.fn().mockReturnValue({ limit });

      LoadTestRun.find.mockReturnValue({ sort });

      req.query = { environment: 'local', limit: '10', rangeDays: '14' };

      await getLoadTestHistory(req, res, next);

      expect(LoadTestRun.find).toHaveBeenCalledWith(expect.objectContaining({ environment: 'local' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          environment: 'local',
          count: 1
        })
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getLoadTestTrends', () => {
    it('returns trend aggregates', async () => {
      const runs = [
        {
          environment: 'staging',
          capturedAt: new Date('2026-05-20T00:00:00.000Z'),
          summary: { failedChecks: 0 },
          scenarios: [
            {
              key: 'cards_read',
              latencyP95Ms: 120,
              requestsPerSecond: 3,
              errorRatePercent: 0
            }
          ]
        },
        {
          environment: 'staging',
          capturedAt: new Date('2026-05-21T00:00:00.000Z'),
          summary: { failedChecks: 1 },
          scenarios: [
            {
              key: 'cards_read',
              latencyP95Ms: 180,
              requestsPerSecond: 2,
              errorRatePercent: 1
            }
          ]
        }
      ];

      const lean = jest.fn().mockResolvedValue(runs);
      const select = jest.fn().mockReturnValue({ lean });
      const sort = jest.fn().mockReturnValue({ select });

      LoadTestRun.find.mockReturnValue({ sort });

      req.query = { environment: 'staging', rangeDays: '30' };

      await getLoadTestTrends(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.overview.totalRuns).toBe(2);
      expect(payload.data.overview.passingRuns).toBe(1);
      expect(payload.data.scenarioTrends).toEqual(expect.arrayContaining([
        expect.objectContaining({
          key: 'cards_read',
          samples: 2,
          avgLatencyP95Ms: 150
        })
      ]));
      expect(next).not.toHaveBeenCalled();
    });
  });
});