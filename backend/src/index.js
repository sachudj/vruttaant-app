require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { connectDatabase, isDatabaseConnected } = require('./config/database');
const newsRoutes = require('./routes/newsRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

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
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.use('/api', apiLimiter);
app.use('/api/news', newsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'vruttaant-backend',
    databaseConnected: isDatabaseConnected(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Vruttaant backend is running',
    health: '/health'
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

function startServer(preferredPort) {
  const server = app.listen(preferredPort, () => {
    console.log(`Server running on http://localhost:${preferredPort}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = preferredPort + 1;
      console.log(`Port ${preferredPort} is in use, retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    throw error;
  });
}

async function bootstrap() {
  await connectDatabase();
  startServer(PORT);
}

process.on('SIGINT', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

bootstrap();
