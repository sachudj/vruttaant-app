const { isDatabaseConnected } = require('../config/database');

function getReadinessStatus(options = {}) {
  const dbCheck = options.isDatabaseConnected || isDatabaseConnected;
  const shutdownCheck = options.isShuttingDown || (() => false);
  const nowIso = options.nowIso || (() => new Date().toISOString());
  const dbConnected = dbCheck();
  const shuttingDown = shutdownCheck();
  const ready = dbConnected && !shuttingDown;

  return {
    ready,
    status: ready ? 'ready' : 'not_ready',
    checks: {
      database: dbConnected ? 'up' : 'down',
      shutdown: shuttingDown ? 'in_progress' : 'idle'
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