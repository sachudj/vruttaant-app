const EventEmitter = require('events');
const {
  normalizePath,
  resolveRequestPath,
  createMetricsMiddleware,
  createMetricsHandler
} = require('../src/observability/metrics');

describe('metrics', () => {
  describe('normalizePath', () => {
    it('normalizes numeric and object id path segments', () => {
      expect(normalizePath('/api/v1/user/123/bookmarks/507f1f77bcf86cd799439011'))
        .toBe('/api/v:id/user/:id/bookmarks/:id');
    });

    it('returns /unknown when path is missing', () => {
      expect(normalizePath()).toBe('/unknown');
    });
  });

  describe('resolveRequestPath', () => {
    it('uses route path and baseUrl when present', () => {
      const req = {
        baseUrl: '/api/v1/user/bookmarks',
        route: { path: '/:id' }
      };

      expect(resolveRequestPath(req)).toBe('/api/v:id/user/bookmarks/:id');
    });

    it('falls back to req.path', () => {
      const req = { path: '/api/v1/news/cards' };
      expect(resolveRequestPath(req)).toBe('/api/v:id/news/cards');
    });
  });

  describe('createMetricsMiddleware', () => {
    it('increments request and error counters on finish', () => {
      const requestCount = { inc: jest.fn() };
      const requestDuration = { observe: jest.fn() };
      const errorCount = { inc: jest.fn() };
      const middleware = createMetricsMiddleware({
        requestCount,
        requestDuration,
        errorCount
      });

      const req = {
        method: 'GET',
        path: '/api/v1/news/cards'
      };
      const res = new EventEmitter();
      res.statusCode = 503;
      const next = jest.fn();

      middleware(req, res, next);
      res.emit('finish');

      expect(next).toHaveBeenCalledWith();
      expect(requestCount.inc).toHaveBeenCalledTimes(1);
      expect(requestDuration.observe).toHaveBeenCalledTimes(1);
      expect(errorCount.inc).toHaveBeenCalledTimes(1);
    });
  });

  describe('createMetricsHandler', () => {
    it('writes metrics output with registry content type', async () => {
      const registry = {
        contentType: 'text/plain; version=0.0.4; charset=utf-8',
        metrics: jest.fn().mockResolvedValue('vruttaant_http_requests_total 10')
      };

      const handler = createMetricsHandler({ registry });
      const req = {};
      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const next = jest.fn();

      await handler(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', registry.contentType);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('vruttaant_http_requests_total 10');
      expect(next).not.toHaveBeenCalled();
    });
  });
});