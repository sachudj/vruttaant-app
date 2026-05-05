# Backend Setup & Configuration

## Directory Structure

```
backend/
├── src/
│   ├── index.js                 # Express app initialization, middleware, routing
│   ├── config/
│   │   └── database.js          # MongoDB connection handler
│   ├── models/
│   │   └── NewsCard.js          # Mongoose schema for news documents
│   ├── services/
│   │   └── newsIngestionService.js  # Web scraping logic (Cheerio)
│   ├── controllers/
│   │   └── newsController.js    # Request/response handlers
│   └── routes/
│       └── newsRoutes.js        # Express route definitions
├── package.json                 # Dependencies and npm scripts
├── .env.example                 # Environment template
├── .env                         # Local environment (git-ignored)
└── node_modules/                # Installed packages (git-ignored)
```

## Installation

```bash
cd backend
npm install
```

This installs:
- `express` - HTTP server framework
- `mongoose` - MongoDB object modeling
- `cheerio` - HTML/XML parsing (for news scraping)
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable loading

Note: LLM summarization uses built-in `fetch` from Node.js runtime (no extra npm SDK required).

## Configuration

### Environment Variables (.env)

Copy the template:
```bash
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://admin:admin123@127.0.0.1:27017/vruttaant?authSource=admin
LLM_API_KEY=
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4o-mini
```

**PORT**: Server listening port (auto-fallback to next free port if occupied)
**MONGODB_URI**: Connection string to MongoDB
**LLM_API_KEY**: API key for summary generation
**LLM_API_URL**: OpenAI-compatible chat completions endpoint
**LLM_MODEL**: Model used for AI summaries

For MongoDB Atlas (cloud):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vruttaant?retryWrites=true&w=majority
```

## Running the Server

### Development Mode (auto-restart on file changes)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will:
1. Load environment variables from `.env`
2. Attempt MongoDB connection
3. Start listening on PORT (or next available port)
4. Log "Server running on http://localhost:PORT"

## Database Configuration

MongoDB runs in Docker with credentials:
- **Username**: admin
- **Password**: admin123
- **Database**: vruttaant
- **Authentication Source**: admin

See [DOCKER.md](./DOCKER.md) for container management.

## Data Models

### NewsCard Schema
Located in `src/models/NewsCard.js`

```javascript
{
  title: String (required),
  summary: String,
  aiSummary: String,                 // LLM-generated neutral 60-word summary
  url: String (required),
  imageUrl: String,
  source: String,
  language: String (default: 'en'),
  publishedAt: Date,
  scrapedAt: Date (default: now),
  rawMetadata: Mixed,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- Unique index on `(url, language)` - prevents duplicate articles per language

## API Middleware

### CORS
Enabled for all origins. Configured in `src/index.js`:
```javascript
app.use(cors());
```

### Body Parsing
JSON parsing enabled:
```javascript
app.use(express.json());
```

## Health Checks

### Root Health Endpoint
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "vruttaant-backend",
  "databaseConnected": true,
  "timestamp": "2026-05-05T10:43:08.506Z"
}
```

### News API Health
```
GET /api/news/ingest/health
```

Response:
```json
{
  "status": "ok",
  "route": "/api/news/ingest"
}
```

## Graceful Shutdown

The server handles `SIGINT` (Ctrl+C) by:
1. Closing MongoDB connection
2. Terminating process
3. Preventing data loss

## Troubleshooting

### MongoDB Connection Refused
- Ensure `npm run infra:up` has completed
- Check Docker: `npm run infra:ps`
- Verify credentials in `.env`

### Port Already in Use
- Backend auto-switches to next free port
- Check what's running: `lsof -i :5000`

### Environment Variables Not Loading
- Verify `.env` exists in backend directory
- Check for typos in variable names
- Restart the server after `.env` changes

## Next Steps
- Review [API_ENDPOINTS.md](./API_ENDPOINTS.md) for endpoint details
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for workflow
