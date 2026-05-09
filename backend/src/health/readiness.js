const { isDatabaseConnected } = require('../config/database');

function getReadinessStatus(options = {}) {
  const dbCheck = options.isDatabaseConnected || isDatabaseConnected;
  const nowIso = options.nowIso || (() => new Date().toISOString());
  const dbConnected = dbCheck();

  return {
    ready: dbConnected,
    status: dbConnected ? 'ready' : 'not_ready',
    checks: {
      database: dbConnected ? 'up' : 'down'
    },
    timestamp: nowIso()
  };
}

function createReadyHandler(options = {}) {
  return (req, res) => {
    const readiness = getReadinessStatus(options);

    res.status(readiness.ready ? 200 : 503).json({
      status: readiness.status,
      service: 'vruttaant-backend',
      checks: readiness.checks,
      timestamp: readiness.timestamp
    });
  };
}

const readyHandler = createReadyHandler();

module.exports = {
  getReadinessStatus,
  createReadyHandler,
  readyHandler
};