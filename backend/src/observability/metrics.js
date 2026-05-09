const client = require('prom-client');

const registry = new client.Registry();

let initialized = false;
let requestCount;
let requestDuration;
let errorCount;

function normalizePath(path) {
  if (!path) {
    return '/unknown';
  }

  return String(path)
    .replace(/[0-9a-f]{24}/gi, ':id')
    .replace(/[0-9]+/g, ':id');
}

function initializeMetrics() {
  if (initialized) {
    return {
      registry,
      requestCount,
      requestDuration,
      errorCount
    };
  }

  client.collectDefaultMetrics({
    register: registry,
    prefix: 'vruttaant_'
  });

  requestCount = new client.Counter({
    name: 'vruttaant_http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'path', 'status_code'],
    registers: [registry]
  });

  requestDuration = new client.Histogram({
    name: 'vruttaant_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry]
  });

  errorCount = new client.Counter({
    name: 'vruttaant_http_errors_total',
    help: 'Total number of HTTP 5xx responses',
    labelNames: ['method', 'path', 'status_code'],
    registers: [registry]
  });

  initialized = true;

  return {
    registry,
    requestCount,
    requestDuration,
    errorCount
  };
}

function resolveRequestPath(req) {
  const routePath = req?.route?.path;
  const baseUrl = req?.baseUrl || '';

  if (routePath) {
    return normalizePath(`${baseUrl}${routePath}`);
  }

  return normalizePath(req?.path || req?.originalUrl || req?.url || '/unknown');
}

function createMetricsMiddleware(options = {}) {
  const counter = options.requestCount || requestCount;
  const histogram = options.requestDuration || requestDuration;
  const errors = options.errorCount || errorCount;

  return (req, res, next) => {
    const startTime = process.hrtime.bigint();

    res.once('finish', () => {
      const durationNs = process.hrtime.bigint() - startTime;
      const durationSeconds = Number(durationNs) / 1e9;
      const labels = {
        method: req.method,
        path: resolveRequestPath(req),
        status_code: String(res.statusCode)
      };

      counter.inc(labels, 1);
      histogram.observe(labels, durationSeconds);

      if (res.statusCode >= 500) {
        errors.inc(labels, 1);
      }
    });

    next();
  };
}

function createMetricsHandler(options = {}) {
  const register = options.registry || registry;

  return async (req, res, next) => {
    try {
      res.setHeader('Content-Type', register.contentType);
      const content = await Promise.resolve(register.metrics());
      res.status(200).send(content);
    } catch (error) {
      next(error);
    }
  };
}

initializeMetrics();

const metricsMiddleware = createMetricsMiddleware();
const metricsHandler = createMetricsHandler();

module.exports = {
  initializeMetrics,
  createMetricsMiddleware,
  createMetricsHandler,
  metricsMiddleware,
  metricsHandler,
  normalizePath,
  resolveRequestPath
};