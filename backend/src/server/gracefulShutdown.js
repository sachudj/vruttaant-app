function createInFlightRequestTracker() {
  let activeRequests = 0;
  let shuttingDown = false;

  const middleware = (req, res, next) => {
    if (shuttingDown) {
      res.setHeader('Connection', 'close');
      res.status(503).json({
        success: false,
        error: {
          statusCode: 503,
          message: 'Server is shutting down. Please retry shortly.'
        }
      });
      return;
    }

    activeRequests += 1;

    let settled = false;
    const onDone = () => {
      if (settled) {
        return;
      }
      settled = true;
      activeRequests = Math.max(0, activeRequests - 1);
    };

    res.once('finish', onDone);
    res.once('close', onDone);

    next();
  };

  return {
    middleware,
    getActiveRequests: () => activeRequests,
    isShuttingDown: () => shuttingDown,
    startShutdown: () => {
      shuttingDown = true;
    }
  };
}

function createGracefulShutdown(options) {
  const {
    server,
    startShutdown,
    getActiveRequests,
    closeDatabase,
    timeoutMs,
    logger,
    exit
  } = options;

  let shuttingDown = false;

  return async (signal = 'SIGTERM') => {
    if (shuttingDown) {
      logger(`[shutdown] ${signal} received while shutdown already in progress.`);
      return;
    }

    shuttingDown = true;
    startShutdown();
    logger(`[shutdown] Received ${signal}. Draining in-flight requests...`);

    let finalized = false;
    const finalize = async (code, message) => {
      if (finalized) {
        return;
      }
      finalized = true;

      logger(message);

      try {
        await closeDatabase();
        logger('[shutdown] Database connections closed.');
      } catch (error) {
        logger(`[shutdown] Failed to close database cleanly: ${error.message}`);
      }

      exit(code);
    };

    const forceTimer = setTimeout(() => {
      void finalize(
        1,
        `[shutdown] Timeout reached with ${getActiveRequests()} active request(s). Forcing shutdown.`
      );
    }, timeoutMs);

    if (typeof forceTimer.unref === 'function') {
      forceTimer.unref();
    }

    server.close((error) => {
      clearTimeout(forceTimer);

      if (error) {
        void finalize(1, `[shutdown] HTTP server close error: ${error.message}`);
        return;
      }

      void finalize(
        0,
        `[shutdown] HTTP server closed. In-flight requests drained: ${getActiveRequests()}.`
      );
    });
  };
}

module.exports = {
  createInFlightRequestTracker,
  createGracefulShutdown
};