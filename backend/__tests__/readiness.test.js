const { getReadinessStatus, createReadyHandler } = require('../src/health/readiness');

describe('readiness', () => {
  describe('getReadinessStatus', () => {
    it('returns ready payload when database is connected', () => {
      const result = getReadinessStatus({
        isDatabaseConnected: () => true,
        nowIso: () => '2026-05-09T12:00:00.000Z'
      });

      expect(result).toEqual({
        ready: true,
        status: 'ready',
        checks: {
          database: 'up'
        },
        timestamp: '2026-05-09T12:00:00.000Z'
      });
    });

    it('returns not_ready payload when database is disconnected', () => {
      const result = getReadinessStatus({
        isDatabaseConnected: () => false,
        nowIso: () => '2026-05-09T12:00:00.000Z'
      });

      expect(result).toEqual({
        ready: false,
        status: 'not_ready',
        checks: {
          database: 'down'
        },
        timestamp: '2026-05-09T12:00:00.000Z'
      });
    });
  });

  describe('createReadyHandler', () => {
    it('returns 200 when app is ready', () => {
      const handler = createReadyHandler({
        isDatabaseConnected: () => true,
        nowIso: () => '2026-05-09T12:00:00.000Z'
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      handler({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ready',
        service: 'vruttaant-backend',
        checks: {
          database: 'up'
        },
        timestamp: '2026-05-09T12:00:00.000Z'
      });
    });

    it('returns 503 when app is not ready', () => {
      const handler = createReadyHandler({
        isDatabaseConnected: () => false,
        nowIso: () => '2026-05-09T12:00:00.000Z'
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      handler({}, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        status: 'not_ready',
        service: 'vruttaant-backend',
        checks: {
          database: 'down'
        },
        timestamp: '2026-05-09T12:00:00.000Z'
      });
    });
  });
});