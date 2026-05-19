'use strict';

const logger = require('../src/observability/logger');

describe('logger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logger.info logs level=info with message', () => {
    logger.info('test info message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test info message');
    expect(entry.timestamp).toBeDefined();
  });

  it('logger.warn logs level=warn', () => {
    logger.warn('test warning');
    const entry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(entry.level).toBe('warn');
  });

  it('logger.error logs level=error', () => {
    logger.error('test error', { errorCode: 42 });
    const entry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(entry.level).toBe('error');
    expect(entry.errorCode).toBe(42);
  });

  it('logger.debug logs level=debug', () => {
    logger.debug('test debug');
    const entry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(entry.level).toBe('debug');
  });

  it('spreads context fields into the log entry', () => {
    logger.info('with context', { userId: 'u1', action: 'view' });
    const entry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(entry.userId).toBe('u1');
    expect(entry.action).toBe('view');
  });

  it('works without context argument', () => {
    expect(() => logger.info('no context')).not.toThrow();
  });
});
