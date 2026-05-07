# Vruttaant
[![CI](https://github.com/sachudj/vruttaant-app/actions/workflows/ci.yml/badge.svg)](https://github.com/sachudj/vruttaant-app/actions/workflows/ci.yml)
[![Release](https://github.com/sachudj/vruttaant-app/actions/workflows/release.yml/badge.svg)](https://github.com/sachudj/vruttaant-app/actions/workflows/release.yml)
[![Latest Release](https://img.shields.io/github/v/release/sachudj/vruttaant-app)](https://github.com/sachudj/vruttaant-app/releases)
[![Coverage](https://codecov.io/gh/sachudj/vruttaant-app/branch/main/graph/badge.svg)](https://codecov.io/gh/sachudj/vruttaant-app)

A multilingual, card-based news app providing a concise "Vruttaant" (chronicle) of local events through a swipable interface.

**Status**: Active Development (v0.2)  
**Last Updated**: May 5, 2026

## Quick Start (5 minutes)

```bash
# 1. Start MongoDB
cd backend && npm run infra:up

# 2. Setup and start backend
cp .env.example .env
npm install
npm start

# 3. In another terminal, start mobile app
cd mobile_app
flutter pub get
flutter run
```

Backend running on: `http://localhost:5000` (or next free port)

## Project Structure

```
vruttaant-app/
├── backend/           # Node.js + Express API server
├── mobile_app/        # Flutter cross-platform app
├── docker-compose.yml # MongoDB + Mongo Express containers
├── docs/              # Complete documentation (START HERE)
└── README.md          # This file
```

## 📚 Documentation

**Start here:** [📖 Documentation Index](./docs/INDEX.md) - Complete navigation guide

**First-time Setup:**
→ [🔧 Environment & Dependencies](./docs/DEPENDENCIES.md) - OS-specific setup (macOS/Linux/Windows)

**Quick Links:**
1. [Setup Guide](./docs/SETUP.md) - Installation & 5-min quick start ⚡
2. [Architecture](./docs/ARCHITECTURE.md) - System design & structure 
3. [Development Guide](./docs/DEVELOPMENT.md) - Daily workflow & common tasks
4. [Project Status](./docs/PROJECT_STATUS.md) - What's done, roadmap, next steps
5. [Roadmap](./docs/ROADMAP.md) - Small-step implementation checklist

**API & Backend:**
- [API Endpoints](./docs/API_ENDPOINTS.md) - Complete reference with examples
- [Backend Guide](./docs/BACKEND.md) - Server setup & configuration
- [Database Schema](./docs/DATABASE.md) - MongoDB models & queries

**Infrastructure:**
- [Docker/MongoDB](./docs/DOCKER.md) - Container management & troubleshooting
- [Mobile App](./docs/MOBILE_APP.md) - Flutter setup & building

## Tech Stack

**Backend**: Node.js 25.9 + Express 4.21 + Mongoose 8.18 + Cheerio 1.0  
**Database**: MongoDB 7 (Docker)  
**Mobile**: Flutter 3.41 + Dart 3.11  
**Infrastructure**: Docker + Docker Compose  

## Key Features Implemented

✅ Backend API with Express  
✅ MongoDB with Docker  
✅ News web scraping (Cheerio)  
✅ Multilingual support structure  
✅ AI summarisation (60-word neutral summary via LLM)  
✅ Supported summary languages: English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Urdu, Kannada, Odia, Malayalam  
✅ Environment-based configuration  
✅ Port auto-fallback (5000 → 5001 → ...)  
✅ Health check endpoints  
✅ Docker infrastructure scripts  
✅ Flutter vertical full-screen NewsCard UI  
✅ Backend-integrated mobile feed via `/api/news/ingest`  
✅ Pull-to-refresh in mobile feed  
✅ Pull-up pagination (append batches)  
✅ Image prefetching for smoother swipes  
✅ Complete documentation  

## Project Status

**Test Coverage**: 114/114 tests passing ✅  
**Overall Progress**: 15/20 items complete (75%)

**By Track:**
- **Track A** (Secure API Baseline): 9/9 (100%) ✅
  - Request validation, error handling, security headers, CORS, rate limiting, payload limits, API versioning
- **Track B** (Authentication): 6/6 (100%) ✅
  - ✅ B1: User model with secure password storage
  - ✅ B2: JWT signup/login endpoints
  - ✅ B3: Refresh token rotation & revocation
  - ✅ B4: Auth middleware for protected routes
  - ✅ B5: Bookmark endpoints with ownership scoping
  - ✅ B6: Role-based access control with admin endpoints
- **Track C** (Observability): 0/7 (0%) ⏳
- **Track D** (Testing): 1/7 (14%) 🔄
  - ✅ D1: 114 unit tests (ingestion, auth, bookmarks, RBAC)
  - ⏳ D2-D7: Integration tests, contract tests, E2E tests
- **Track E** (Data Governance): 0/6 (0%) ⏳
- **Track F** (Feature Milestones): 0/4 (0%) ⏳

For detailed roadmap, see [docs/ROADMAP.md](./docs/ROADMAP.md).

## Next Phase (Roadmap)

Detailed implementation sequencing now lives in [docs/ROADMAP.md](./docs/ROADMAP.md).

- [ ] API endpoint to retrieve saved news from database
- [ ] User authentication & profiles
- [ ] Bookmark/save articles feature
- [ ] Language preference settings
- [ ] Background news sync
- [ ] Push notifications
- [ ] Advanced search & filtering

### Industry-Standard Secure App Checklist

- [ ] Add centralized request validation (query/body/schema) for all API endpoints
- [ ] Add security middleware: Helmet, strict CORS policy, and rate limiting
- [ ] Add API auth hardening: JWT rotation, refresh token revocation, and protected routes
- [ ] Add backend unit + integration tests for critical APIs (`/api/news/ingest`, `/api/news/cards`)
- [ ] Add structured logging with request IDs and centralized error handling
- [ ] Add observability: metrics, error tracking, and alerting for backend failures
- [ ] Add API versioning strategy (`/api/v1`) with backward-compatibility policy
- [ ] Add production readiness probes (`/health`, `/ready`) and graceful shutdown handling
- [ ] Add dependency and container security scans in CI (SAST + npm audit gating)
- [ ] Add secrets management policy (no plaintext secrets, rotation, environment separation)
- [ ] Add role-based access controls for admin/internal operations
- [ ] Add data governance for LLM output (category taxonomy validation + fallback rules)

## Infrastructure Scripts

From `backend/` directory:

```bash
npm run infra:up      # Start MongoDB
npm run infra:ps      # Check status
npm run infra:down    # Stop MongoDB
```

## GitHub Actions

This repository now includes CI and release automation:

- `.github/workflows/ci.yml`
  - Runs backend syntax + startup health checks
  - Runs Flutter analyze + widget tests
- `.github/workflows/progress-report.yml`
  - Reads `docs/PROJECT_STATUS.md` checklists
  - Publishes completion percentage to workflow summary
- `.github/workflows/release-drafter.yml`
  - Maintains a draft release note from merged changes
- `.github/workflows/release.yml`
  - Publishes a GitHub Release automatically when a `v*` tag is pushed

### Release Flow

```bash
git tag v0.3.0
git push origin v0.3.0
```

Pushing the tag triggers the Release workflow and creates a GitHub Release with generated notes.

## Useful Links

- **Backend Health**: http://localhost:5000/health
- **Mongo Express UI**: http://localhost:8081
  - Username: `admin`
  - Password: `admin123`

## Troubleshooting

**Port already in use?**  
Backend auto-switches to next free port. Check terminal output.

**MongoDB connection failed?**  
Run `npm run infra:ps` to verify containers are running.

**Mobile app won't build?**  
```bash
cd mobile_app
flutter clean
flutter pub get
flutter run
```

For more help, see [DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Contributing

All documentation is in `docs/` folder. Update relevant doc when making changes.

## License

MIT License - See [LICENSE](./LICENSE) file
