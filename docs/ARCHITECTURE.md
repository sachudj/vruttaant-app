# System Architecture

## Overview
Vruttaant is a multilingual, card-based news app with a decoupled backend and mobile frontend.

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter Mobile App                    │
│  (mobile_app/)  - Dart/Flutter UI, swipable news cards  │
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
├── mobile_app/                       # Flutter cross-platform app
│   ├── lib/
│   │   ├── main.dart                # App shell + vertical PageView feed
│   │   ├── models/
│   │   │   └── news_item.dart       # Mobile news data model
│   │   ├── services/
│   │   │   └── news_api_service.dart # API client for /api/news/ingest
│   │   └── widgets/
│   │       └── news_card.dart       # Full-screen swipe card UI
│   ├── android/
│   ├── ios/
│   ├── pubspec.yaml                 # Flutter dependencies (includes http)
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
- **Framework**: Flutter 3.41.9
- **Language**: Dart 3.11.5
- **Networking**: http ^1.2.2
- **Target Platforms**: iOS, Android, Web

### Infrastructure
- **Container**: Docker
- **Database UI**: Mongo Express 1.0.2

## Data Flow

1. **Feed Loading (Mobile)**
   - Mobile app calls `GET /api/v1/news/cards` through `NewsApiService`
   - Background sync job ingests news via `POST /api/v1/news/ingest` on a schedule
   - Feed is rendered as vertical full-screen cards (`PageView`)
   - Pull-to-refresh reloads page 1
   - Pull-up pagination appends additional batches
   - Next images are prefetched for smoother card transitions
   - Signed-in users will use `GET /api/v1/news/recommended` once Track Q1 is implemented

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
