let trackerClient = null;
let trackerEnabled = false;

function resolveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function initErrorTracker(options = {}) {
  const dsn = options.dsn !== undefined ? options.dsn : process.env.SENTRY_DSN;

  if (!dsn) {
    trackerClient = null;
    trackerEnabled = false;
    return {
      enabled: false,
      provider: 'none'
    };
  }

  const client = options.client || require('@sentry/node');

  client.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || 'dev',
    tracesSampleRate: resolveNumber(process.env.SENTRY_TRACES_SAMPLE_RATE, 0)
  });

  trackerClient = client;
  trackerEnabled = true;

  return {
    enabled: true,
    provider: 'sentry'
  };
}

function captureError(error, context = {}) {
  if (!trackerEnabled || !trackerClient) {
    return false;
  }

  trackerClient.withScope((scope) => {
    scope.setLevel('error');

    if (context.requestId) {
      scope.setTag('request_id', context.requestId);
    }

    if (context.statusCode) {
      scope.setTag('status_code', String(context.statusCode));
    }

    if (context.path || context.method) {
      scope.setContext('http', {
        method: context.method,
        path: context.path
      });
    }

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    trackerClient.captureException(error);
  });

  return true;
}

function isErrorTrackerEnabled() {
  return trackerEnabled;
}

module.exports = {
  initErrorTracker,
  captureError,
  isErrorTrackerEnabled
};