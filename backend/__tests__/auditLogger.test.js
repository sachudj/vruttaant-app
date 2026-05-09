const { logAuditEvent } = require('../src/observability/auditLogger');

describe('auditLogger', () => {
  const originalConsoleLog = console.log;

  afterEach(() => {
    console.log = originalConsoleLog;
    jest.restoreAllMocks();
  });

  test('writes a structured JSON audit log', () => {
    const logSpy = jest.fn();
    console.log = logSpy;

    const result = logAuditEvent('llm_summary_category_provider_error', {
      statusCode: 503,
      url: 'https://example.com/news/1',
      language: 'en'
    });

    expect(result).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(logSpy.mock.calls[0][0]);
    expect(payload).toMatchObject({
      level: 'audit',
      event: 'llm_summary_category_provider_error',
      statusCode: 503,
      url: 'https://example.com/news/1',
      language: 'en'
    });
    expect(typeof payload.timestamp).toBe('string');
  });

  test('returns false if logging throws', () => {
    console.log = jest.fn(() => {
      throw new Error('log failed');
    });

    const result = logAuditEvent('event_name', { foo: 'bar' });
    expect(result).toBe(false);
  });
});
