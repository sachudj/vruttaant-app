require('dotenv').config();

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const { connectDatabase, isDatabaseConnected } = require('./config/database');
const apiRouter = require('./routes/apiRouter');
const { openApiSpec } = require('./docs/openapi');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { createReadyHandler } = require('./health/readiness');
const {
  createInFlightRequestTracker,
  createGracefulShutdown
} = require('./server/gracefulShutdown');
const { initErrorTracker } = require('./observability/errorTracker');
const {
  initializeMetrics,
  metricsMiddleware,
  metricsHandler
} = require('./observability/metrics');
const { startNewsSyncJob, stopNewsSyncJob } = require('./jobs/newsSyncJob');
const { startTrendScoreJob, stopTrendScoreJob } = require('./jobs/trendScoreJob');
const { runMigrations } = require('./migrations/runner');
const { eventCaptureMiddleware } = require('./middleware/eventCapture');
const { initializeBadgeDefinitions } = require('./services/badgeService');
const { connectRedis, closeRedis, isRedisConnected } = require('./config/redis');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS) || 10000;
const inFlightRequests = createInFlightRequestTracker();

const readyHandler = createReadyHandler({
  isDatabaseConnected,
  isShuttingDown: inFlightRequests.isShuttingDown
});

function getResponseCompressionThresholdBytes() {
  const configuredValue = process.env.RESPONSE_COMPRESSION_THRESHOLD_BYTES;

  if (configuredValue === undefined || configuredValue === null || configuredValue === '') {
    return 1536;
  }

  const parsedValue = Number(configuredValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 1536;
  }

  return parsedValue;
}

function shouldCompressResponse(req, res) {
  if (req.path === '/metrics') {
    return false;
  }

  return compression.filter(req, res);
}

function buildAllowedOrigins() {
  const envOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (envOrigins.length > 0) {
    return envOrigins;
  }

  if (process.env.NODE_ENV === 'production') {
    return [];
  }

  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
}

const allowedOrigins = buildAllowedOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
};

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      statusCode: 429,
      message: 'Too many requests. Please try again later.'
    }
  }
});

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({
  limit: process.env.JSON_PAYLOAD_LIMIT || '10kb'
}));
app.use(compression({
  threshold: getResponseCompressionThresholdBytes(),
  filter: shouldCompressResponse
}));
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(eventCaptureMiddleware);
app.use(inFlightRequests.middleware);
app.use('/api', apiLimiter);
app.use('/api', apiRouter);

app.get('/api/docs.json', (req, res) => {
  res.status(200).json(openApiSpec);
});

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: 'Vruttaant API Docs'
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'vruttaant-backend',
    databaseConnected: isDatabaseConnected(),
    cacheConnected: isRedisConnected(),
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', readyHandler);
app.get('/metrics', metricsHandler);

app.get('/', (req, res) => {
  res.json({
    message: 'Vruttaant backend is running',
    version: '1.0.0',
    health: '/health',
    api: '/api/v1',
    docs: '/api/docs'
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

function startServer(preferredPort) {
  return new Promise((resolve, reject) => {
    const server = app.listen(preferredPort, () => {
      console.log(`Server running on http://localhost:${preferredPort}`);
      resolve(server);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = preferredPort + 1;
        console.log(`Port ${preferredPort} is in use, retrying on ${nextPort}...`);
        resolve(startServer(nextPort));
        return;
      }

      reject(error);
    });
  });
}

async function bootstrap() {
  initializeMetrics();

  const tracker = initErrorTracker();
  if (tracker.enabled) {
    console.log('[observability] External error tracking enabled (Sentry).');
  } else {
    console.log('[observability] External error tracking disabled (missing SENTRY_DSN).');
  }

  connectRedis();

  const databaseConnected = await connectDatabase();
  if (databaseConnected) {
    await runMigrations();
    await initializeBadgeDefinitions();
  } else {
    console.log('[migrations] Skipped - database not connected.');
  }
  const server = await startServer(PORT);

  startNewsSyncJob();
  startTrendScoreJob();

  const gracefulShutdown = createGracefulShutdown({
    server,
    startShutdown: inFlightRequests.startShutdown,
    getActiveRequests: inFlightRequests.getActiveRequests,
    closeDatabase: async () => {
      stopNewsSyncJob();
      stopTrendScoreJob();
      await closeRedis();
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
    },
    timeoutMs: GRACEFUL_SHUTDOWN_TIMEOUT_MS,
    logger: (message) => console.log(message),
    exit: (code) => process.exit(code)
  });

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
}

if (require.main === module) {
  bootstrap();
}

module.exports = {
  app,
  startServer,
  bootstrap
};
