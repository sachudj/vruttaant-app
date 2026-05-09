jest.mock('../src/observability/errorTracker', () => ({
  captureError: jest.fn()
}));

const { AppError, errorHandler } = require('../src/middleware/errorHandler');
const { captureError } = require('../src/observability/errorTracker');

describe('errorHandler', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      requestId: 'req-abc',
      method: 'GET',
      originalUrl: '/api/v1/news/cards',
      user: { id: 'user-1' }
    };
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('does not report 4xx errors to external tracker', () => {
    const error = new AppError(400, 'Bad request');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(captureError).not.toHaveBeenCalled();
  });

  it('reports 5xx errors to external tracker with request metadata', () => {
    const error = new Error('unexpected failure');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(captureError).toHaveBeenCalledWith(error, {
      requestId: 'req-abc',
      statusCode: 500,
      method: 'GET',
      path: '/api/v1/news/cards',
      userId: 'user-1'
    });
  });

  it('includes requestId in client-facing error payload', () => {
    const error = new AppError(401, 'Unauthorized');

    errorHandler(error, req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.error.requestId).toBe('req-abc');
  });
});