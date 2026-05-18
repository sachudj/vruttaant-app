/**
 * Simple structured logger for the backend
 * Outputs JSON-formatted logs to console
 */

const log = (level, message, context = {}) => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context
  };

  console.log(JSON.stringify(entry));
};

const logger = {
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context),
  debug: (message, context) => log('debug', message, context)
};

module.exports = logger;
