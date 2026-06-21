# System Architecture

## Overview
Vruttaant is a multilingual, card-based news app with a decoupled backend and mobile frontend.

```
┌─────────────────────────────────────────────────────────┐
│                    Native Android App                   │
│  (mobile_app/) - Kotlin/Compose, swipable news cards     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP/REST
                       │
┌──────────────────────▼──────────────────────────────────┐
│             Node.js + Express Backend                    │
│              (backend/) - News API                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ Database Connection
                       │
┌──────────────────────▼──────────────────────────────────┐
│          MongoDB (Docker Container)                      │
│    Data persistence + Mongo Express UI (port 8081)      │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
vruttaant-app/
├── backend/                          # Node.js Express API
│   ├── src/
│   │   ├── index.js                 # Server entry point
│   │   ├── config/
│   │   │   └── database.js          # MongoDB connection config
│   │   ├── models/
│   │   │   └── NewsCard.js          # MongoDB news card schema
│   │   ├── services/
│   │   │   └── newsIngestionService.js  # Cheerio HTML parsing
│   │   ├── controllers/
│   │   │   └── newsController.js    # Request handlers
│   │   └── routes/
│   │       └── newsRoutes.js        # API route definitions
│   ├── package.json                 # Dependencies (express, mongoose, cheerio, cors, dotenv)
│   ├── .env.example                 # Environment template
│   ├── .env                         # Local config (not in git)
│   └── node_modules/                # Installed packages
│
├── mobile_app/                       # Native Android application
│   ├── app/
│   │   ├── src/main/java/com/example/vruttaant/
│   │   │   ├── MainActivity.kt      # Launch activity entrypoint
│   │   │   ├── Navigation.kt        # Routing configuration
│   │   │   ├── data/                # Local cache, DataStore & Retrofit layers
│   │   │   └── ui/                  # Compose Views & ViewModels
│   │   └── build.gradle.kts         # App-specific build definitions
│   ├── gradle/
│   │   └── libs.versions.toml       # Cataloged libraries configuration
│   └── settings.gradle.kts          # Multi-project config
│   └── ...
│
├── docker-compose.yml               # MongoDB + Mongo Express services
├── docs/                            # Documentation (this folder)
├── README.md                        # Project overview
├── LICENSE                          # MIT License
└── .gitignore                       # Git ignore rules

```

## Technology Stack

### Backend
- **Framework**: Express.js 4.21.2
- **Database**: MongoDB 7 (Docker)
- **ODM**: Mongoose 8.18.0
- **HTML Parsing**: Cheerio 1.0.0
- **CORS**: cors 2.8.5
- **Environment**: dotenv 17.4.2
- **Runtime**: Node.js 25.9.0

### Mobile
- **Framework**: Jetpack Compose (UI)
- **Language**: Kotlin 2.1+ / Java 17
- **Networking**: Retrofit 2.11 / OkHttp 4
- **Target Platforms**: Android (API 24+)

### Infrastructure
- **Container**: Docker
- **Database UI**: Mongo Express 1.0.2

## Data Flow

1. **Feed Loading (Mobile)**
   - Mobile app calls `POST /api/news/ingest` through `NewsApiService`
   - Feed is rendered as vertical full-screen cards (`VerticalPager`)
   - Pull-to-refresh reloads page 0
   - Pull-up pagination appends additional batches
   - Next images are prefetched for smoother card transitions

2. **News Ingestion (Backend)**
   - Mobile/external requests send source URL
   - Backend uses Cheerio to scrape HTML
   - Extracts title, summary, image URL, publish date
   - Sends scraped content to LLM with prompt: `Summarize this news in exactly 60 words in [Language], keeping a neutral tone.`
   - Adds `aiSummary` to each card (empty fallback when LLM config is missing)
   - Persists unique cards to MongoDB (upsert strategy)

3. **Data Storage**
   - NewsCard model with fields: title, summary, aiSummary, url, imageUrl, source, language, publishedAt, scrapedAt
   - Unique index on (url, language) to prevent duplicates
   - Automatic timestamps for createdAt/updatedAt

4. **API Response**
   - Returns parsed cards with persistence status
   - Shows count of new vs. updated documents
   - Includes preview of first 5 cards

## Port Configuration

- **Backend**: 5000 (auto-fallback to 5001, 5002... if occupied)
- **MongoDB**: 27017
- **Mongo Express**: 8081

## Environment Variables

Set in `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://admin:admin123@127.0.0.1:27017/vruttaant?authSource=admin
LLM_API_KEY=
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4o-mini
```

## Deployment Model

Currently optimized for **local development**. Future ready for:
- Container orchestration (Kubernetes)
- Cloud MongoDB Atlas
- API Gateway / Load Balancer
- CI/CD pipeline (GitHub Actions)
