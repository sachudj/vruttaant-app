# Vruttaant
[![CI](https://github.com/sachudj/vruttaant-app/actions/workflows/ci.yml/badge.svg)](https://github.com/sachudj/vruttaant-app/actions/workflows/ci.yml)
[![Reviewdog](https://github.com/sachudj/vruttaant-app/actions/workflows/reviewdog.yml/badge.svg)](https://github.com/sachudj/vruttaant-app/actions/workflows/reviewdog.yml)
[![Release](https://github.com/sachudj/vruttaant-app/actions/workflows/release.yml/badge.svg)](https://github.com/sachudj/vruttaant-app/actions/workflows/release.yml)
[![Latest Release](https://img.shields.io/github/v/release/sachudj/vruttaant-app)](https://github.com/sachudj/vruttaant-app/releases)
[![Coverage](https://codecov.io/gh/sachudj/vruttaant-app/branch/main/graph/badge.svg)](https://codecov.io/gh/sachudj/vruttaant-app)

A multilingual, card-based news app providing a concise "Vruttaant" (chronicle) of local events through a swipable interface.

**Status**: Active Development (v0.7)  
**Last Updated**: May 24, 2026

## Quick Start (5 minutes)

```bash
# 1. Start MongoDB
cd backend && npm run infra:up

# 2. Setup and start backend
cp .env.example .env
npm install
npm start

# 3. In another terminal, compile and install mobile app
cd mobile_app
./gradlew installDebug
```

Backend running on: `http://localhost:5000` (or next free port)

Interactive API docs:
- Swagger UI: `http://localhost:5000/api/docs` (or `:5001` if fallback port is used)
- OpenAPI JSON: `http://localhost:5000/api/docs.json`
- Postman collection: `docs/Vruttaant.postman_collection.json`

## Project Structure

```
vruttaant-app/
├── backend/           # Node.js + Express API server
├── mobile_app/        # Native Android app (Jetpack Compose & Kotlin)
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
- [Mobile App](./docs/MOBILE_APP.md) - Native Android setup & building
- [Deployment Runbook](./docs/DEPLOYMENT.md) - Environment profiles, rollout/rollback, CI deployment gate

## Tech Stack

**Backend**: Node.js 25.9 + Express 4.21 + Mongoose 8.18 + Cheerio 1.0  
**Database**: MongoDB 7 (Docker)  
**Mobile**: Native Android (Kotlin + Jetpack Compose)  
**Infrastructure**: Docker + Docker Compose  

## Key Features Implemented

**Backend API**
✅ Express.js with comprehensive security (CORS, rate limiting, request validation, helmet)  
✅ JWT authentication with refresh token rotation  
✅ Role-based access control (admin endpoints)  
✅ Request validation middleware with error handling  
✅ Structured JSON logging with request IDs  
✅ Graceful shutdown and readiness checks  
✅ External error tracking (Sentry integration)  
✅ Prometheus metrics export  

**News & Feed Intelligence**
✅ News web scraping (Cheerio) with quality validation  
✅ Cross-source duplicate detection via title fingerprinting  
✅ AI summarisation (60-word neutral summary via LLM)  
✅ Trending score calculation with time decay  
✅ Database-driven news source registry  
✅ Recommendation engine (blended scoring with personalization & diversity)  
✅ Full-text search & sorting (`/api/v1/news/cards`)  
✅ Article translation (`/api/v1/news/translate`)  

**Analytics & User Behavior**
✅ User activity event tracking (view, bookmark, translate, share)  
✅ Content performance metrics aggregation  
✅ User engagement analytics endpoint  
✅ Editorial dashboard support (trending, categories, engagement)  

**Mobile App**
✅ Native Jetpack Compose UI with vertical card swipe and horizontal WebView article reader  
✅ Pull-to-refresh and pull-up pagination  
✅ Dynamic image loading with Coil  
✅ Settings/Profile screen with user preference synchronization  
✅ Bookmarks management (add/list/delete)  
✅ Push notifications (Firebase Cloud Messaging integration)  
✅ Multilingual UI (`en`/`hi`) with dynamic localized string mapping  
✅ Feed caching with DataStore preferences and offline fallback  
✅ Real-time Translation controls with state badges  
✅ Custom event tracking for views, translation, share, and bookmark analytics  

**Data Governance**
✅ Strict category taxonomy with fallback mapping  
✅ Duplicate detection strategy  
✅ Source-level quality rules  
✅ Audit logging for LLM failures  
✅ Reprocessing job for missing metadata  

**Infrastructure & DevOps**
✅ MongoDB 7 with Docker Compose  
✅ Environment-based configuration (dotenv)  
✅ Load testing baseline with SLO targets  
✅ CI/CD pipeline (GitHub Actions with test gates)  
✅ Production deployment runbook  
✅ Security scanning (SAST + vulnerability)  
✅ Comprehensive documentation (18 guides)  

## Project Status

Tracks **A through N are complete** (security, auth, reliability, testing, data governance, mobile UX, feed intelligence, recommendations, analytics, engagement, performance, infrastructure operations, and documentation/UX polish).

Current focus is **follow-on optimization** using telemetry and load-history data.

For the detailed milestone and step log, see:
- [docs/ROADMAP.md](./docs/ROADMAP.md)
- [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)

For detailed roadmap, see [docs/ROADMAP.md](./docs/ROADMAP.md).

## Next Phase (Roadmap)

Detailed implementation sequencing now lives in [docs/ROADMAP.md](./docs/ROADMAP.md).

- [x] API endpoint to retrieve saved news from database
- [x] User authentication & profiles
- [x] Bookmark/save articles feature
- [x] Language preference settings
- [x] Background news sync
- [x] Push notifications
- [x] Advanced search & filtering

### Industry-Standard Secure App Checklist

- [x] Add centralized request validation (query/body/schema) for all API endpoints
- [x] Add security middleware: Helmet, strict CORS policy, and rate limiting
- [x] Add API auth hardening: JWT rotation, refresh token revocation, and protected routes
- [x] Add backend unit + integration tests for critical APIs (`/api/news/ingest`, `/api/news/cards`)
- [x] Add structured logging with request IDs and centralized error handling
- [x] Add observability: metrics, error tracking, and alerting for backend failures
- [x] Add API versioning strategy (`/api/v1`) with backward-compatibility policy
- [x] Add production readiness probes (`/health`, `/ready`) and graceful shutdown handling
- [x] Add dependency and container security scans in CI (SAST + npm audit gating)
- [x] Add secrets management policy (no plaintext secrets, rotation, environment separation)
- [x] Add role-based access controls for admin/internal operations
- [x] Add data governance for LLM output (category taxonomy validation + fallback rules)

### API Tooling Snapshot

- [x] Swagger/OpenAPI runtime docs at `/api/docs` and `/api/docs.json`
- [x] Postman import collection at `docs/Vruttaant.postman_collection.json`
- [x] Docs parity CI guard via `scripts/check-api-docs.sh`

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
  - Runs Android build and JVM unit tests
- `.github/workflows/reviewdog.yml`
  - Runs backend ESLint and Flutter analyze on pull requests
  - Publishes inline PR review comments for changed lines
- `.github/workflows/security.yml`
  - Runs CodeQL SAST scans for JavaScript code
  - Runs Trivy filesystem scan for vulnerabilities, secrets, and misconfigurations
- `.github/workflows/progress-report.yml`
  - Reads `docs/PROJECT_STATUS.md` checklists
  - Publishes completion percentage to workflow summary
- `.github/workflows/release-drafter.yml`
  - Maintains a draft release note from merged changes
- `.github/workflows/release.yml`
  - Publishes a GitHub Release automatically when a `v*` tag is pushed
- `.github/workflows/deploy-gate.yml`
  - Runs smoke checks and strict load SLO baseline before deployment progression

### Release Flow

```bash
git tag v0.3.0
git push origin v0.3.0
```

Pushing the tag triggers the Release workflow and creates a GitHub Release with generated notes.

## Release Check (Manual Verification)

Use this before cutting a release to validate core backend flows end to end.

```bash
# Auto-selects a free port, starts backend, runs smoke checks, and stops backend
bash scripts/run-smoke-auto.sh
```

What this verifies:
- Readiness and health probes (`/ready`, `/health`)
- Health and API version routing
- Input validation failure paths
- Auth lifecycle (signup, login, refresh rotation, logout revocation)
- Protected bookmark routes and duplicate guard
- RBAC deny path for non-admin access

Optional admin allow-path verification:

```bash
REQUIRE_ADMIN_SUCCESS=true ADMIN_EMAIL=your_admin_email ADMIN_PASSWORD=your_admin_password bash scripts/run-smoke-auto.sh
```

Expected summary for successful run:
- PASS count for all core checks
- FAIL=0
- SKIP=1 when admin allow-path is not enabled

## Useful Links

- **Backend Health**: http://localhost:5000/health
- **Backend Readiness**: http://localhost:5000/ready
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
./gradlew clean
./gradlew testDebugUnitTest
./gradlew installDebug
```

For more help, see [DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Contributing

All documentation is in `docs/` folder. Update relevant doc when making changes.

## License

MIT License - See [LICENSE](./LICENSE) file
