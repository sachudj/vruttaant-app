const crypto = require('crypto');

function resolveRequestId(req) {
  const existing = req.headers['x-request-id'];
  if (typeof existing === 'string' && existing.trim()) {
    return existing.trim();
  }

  return crypto.randomUUID();
}

function createRequestLogger(options = {}) {
  const logger = options.logger || console.log;
  const now = options.now || Date.now;

  return (req, res, next) => {
    const requestId = resolveRequestId(req);
    const path = req.originalUrl || req.url;
    const startMs = now();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    logger(JSON.stringify({
      level: 'info',
      event: 'request_start',
      requestId,
      method: req.method,
      path,
      timestamp: new Date(startMs).toISOString()
    }));

    res.once('finish', () => {
      const endMs = now();

      logger(JSON.stringify({
        level: 'info',
        event: 'request_complete',
        requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: endMs - startMs,
        timestamp: new Date(endMs).toISOString()
      }));
    });

    next();
  };
}

const requestLogger = createRequestLogger();

module.exports = {
  requestLogger,
  createRequestLogger,
  resolveRequestId
};