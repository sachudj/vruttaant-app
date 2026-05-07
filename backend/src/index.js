require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { connectDatabase, isDatabaseConnected } = require('./config/database');
const newsRoutes = require('./routes/newsRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(helmet());
app.use(express.json());
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
