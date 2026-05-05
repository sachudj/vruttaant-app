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
│   ├── android/
│   ├── ios/
│   ├── pubspec.yaml                 # Flutter dependencies
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
- **Target Platforms**: iOS, Android, Web

### Infrastructure
- **Container**: Docker
- **Database UI**: Mongo Express 1.0.2

## Data Flow

1. **News Ingestion**
   - Mobile/external requests POST /api/news/ingest with source URL
   - Backend uses Cheerio to scrape HTML
   - Extracts title, summary, image URL, publish date
   - Persists unique cards to MongoDB (upsert strategy)

2. **Data Storage**
   - NewsCard model with fields: title, summary, url, imageUrl, source, language, publishedAt, scrapedAt
   - Unique index on (url, language) to prevent duplicates
   - Automatic timestamps for createdAt/updatedAt

3. **API Response**
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
```

## Deployment Model

Currently optimized for **local development**. Future ready for:
- Container orchestration (Kubernetes)
- Cloud MongoDB Atlas
- API Gateway / Load Balancer
- CI/CD pipeline (GitHub Actions)
