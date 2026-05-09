const {
  initErrorTracker,
  captureError,
  isErrorTrackerEnabled
} = require('../src/observability/errorTracker');

describe('errorTracker', () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.APP_VERSION;
  });

  it('stays disabled when DSN is not configured', () => {
    const status = initErrorTracker({ dsn: '' });

    expect(status).toEqual({ enabled: false, provider: 'none' });
    expect(isErrorTrackerEnabled()).toBe(false);
    expect(captureError(new Error('boom'))).toBe(false);
  });

  it('initializes sentry and captures exception with context', () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25';
    process.env.SENTRY_ENVIRONMENT = 'test';
    process.env.APP_VERSION = '1.2.3';

    const setLevel = jest.fn();
    const setTag = jest.fn();
    const setContext = jest.fn();
    const setUser = jest.fn();
    const captureException = jest.fn();

    const sentryMock = {
      init: jest.fn(),
      withScope: jest.fn((handler) => {
        handler({ setLevel, setTag, setContext, setUser });
      }),
      captureException
    };

    const status = initErrorTracker({ dsn: 'https://example@sentry.io/1', client: sentryMock });

    expect(status).toEqual({ enabled: true, provider: 'sentry' });
    expect(isErrorTrackerEnabled()).toBe(true);
    expect(sentryMock.init).toHaveBeenCalledWith({
      dsn: 'https://example@sentry.io/1',
      environment: 'test',
      release: '1.2.3',
      tracesSampleRate: 0.25
    });

    const error = new Error('db failure');
    const captured = captureError(error, {
      requestId: 'req-123',
      statusCode: 500,
      method: 'GET',
      path: '/api/v1/news/cards',
      userId: 'user-1'
    });

    expect(captured).toBe(true);
    expect(setLevel).toHaveBeenCalledWith('error');
    expect(setTag).toHaveBeenCalledWith('request_id', 'req-123');
    expect(setTag).toHaveBeenCalledWith('status_code', '500');
    expect(setContext).toHaveBeenCalledWith('http', {
      method: 'GET',
      path: '/api/v1/news/cards'
    });
    expect(setUser).toHaveBeenCalledWith({ id: 'user-1' });
    expect(captureException).toHaveBeenCalledWith(error);
  });
});