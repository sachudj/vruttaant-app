const { EventEmitter } = require('events');
const crypto = require('crypto');
const {
  createRequestLogger,
  resolveRequestId
} = require('../src/middleware/requestLogger');

describe('requestLogger middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/v1/news/cards?page=1'
    };

    res = new EventEmitter();
    res.setHeader = jest.fn();
    res.statusCode = 200;

    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses incoming x-request-id and propagates it to response header', () => {
    req.headers['x-request-id'] = 'req-123';

    const logs = [];
    const middleware = createRequestLogger({
      logger: (entry) => logs.push(JSON.parse(entry)),
      now: () => 1000
    });

    middleware(req, res, next);

    expect(req.requestId).toBe('req-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-123');
    expect(next).toHaveBeenCalledWith();
    expect(logs[0]).toMatchObject({
      event: 'request_start',
      requestId: 'req-123',
      method: 'GET',
      path: '/api/v1/news/cards?page=1'
    });
  });

  it('generates request id, logs start and completion with duration', () => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('generated-req-id');

    const logs = [];
    const nowMock = jest.fn()
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1042);

    const middleware = createRequestLogger({
      logger: (entry) => logs.push(JSON.parse(entry)),
      now: nowMock
    });

    middleware(req, res, next);
    res.statusCode = 201;
    res.emit('finish');

    expect(req.requestId).toBe('generated-req-id');
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      level: 'info',
      event: 'request_start',
      requestId: 'generated-req-id'
    });
    expect(logs[1]).toMatchObject({
      level: 'info',
      event: 'request_complete',
      requestId: 'generated-req-id',
      statusCode: 201,
      durationMs: 42
    });
  });

  it('resolveRequestId trims incoming request id', () => {
    const id = resolveRequestId({ headers: { 'x-request-id': '  abc-123  ' } });
    expect(id).toBe('abc-123');
  });
});