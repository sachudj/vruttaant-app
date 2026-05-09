const EventEmitter = require('events');
const {
  createInFlightRequestTracker,
  createGracefulShutdown
} = require('../src/server/gracefulShutdown');

describe('gracefulShutdown', () => {
  describe('createInFlightRequestTracker', () => {
    it('tracks and drains active requests', () => {
      const tracker = createInFlightRequestTracker();

      const req = { method: 'GET', url: '/api/v1/news/cards' };
      const res = new EventEmitter();
      res.setHeader = jest.fn();
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn();
      const next = jest.fn();

      tracker.middleware(req, res, next);

      expect(tracker.getActiveRequests()).toBe(1);
      expect(next).toHaveBeenCalledWith();

      res.emit('finish');
      expect(tracker.getActiveRequests()).toBe(0);
    });

    it('rejects new requests once shutdown starts', () => {
      const tracker = createInFlightRequestTracker();
      tracker.startShutdown();

      const req = { method: 'GET', url: '/api/v1/news/cards' };
      const res = new EventEmitter();
      res.setHeader = jest.fn();
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn();
      const next = jest.fn();

      tracker.middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'close');
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          statusCode: 503,
          message: 'Server is shutting down. Please retry shortly.'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createGracefulShutdown', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('closes server and database, then exits with code 0', async () => {
      const server = {
        close: jest.fn((callback) => callback())
      };
      const startShutdown = jest.fn();
      const closeDatabase = jest.fn().mockResolvedValue(undefined);
      const exit = jest.fn();
      const logger = jest.fn();

      const handler = createGracefulShutdown({
        server,
        startShutdown,
        getActiveRequests: () => 0,
        closeDatabase,
        timeoutMs: 200,
        logger,
        exit
      });

      await handler('SIGTERM');
      await new Promise((resolve) => setImmediate(resolve));

      expect(startShutdown).toHaveBeenCalledTimes(1);
      expect(server.close).toHaveBeenCalledTimes(1);
      expect(closeDatabase).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(0);
    });

    it('forces shutdown after timeout if server does not close', async () => {
      jest.useFakeTimers();

      const server = {
        close: jest.fn()
      };
      const startShutdown = jest.fn();
      const closeDatabase = jest.fn().mockResolvedValue(undefined);
      const exit = jest.fn();
      const logger = jest.fn();

      const handler = createGracefulShutdown({
        server,
        startShutdown,
        getActiveRequests: () => 3,
        closeDatabase,
        timeoutMs: 100,
        logger,
        exit
      });

      await handler('SIGINT');

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(startShutdown).toHaveBeenCalledTimes(1);
      expect(closeDatabase).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});