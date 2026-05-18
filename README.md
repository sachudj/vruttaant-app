# Vruttaant
[![CI](https://github.com/sachudj/vruttaant-app/actions/workflows/ci.yml/badge.svg)](https://github.com/sachudj/vruttaant-app/actions/workflows/ci.yml)
[![Release](https://github.com/sachudj/vruttaant-app/actions/workflows/release.yml/badge.svg)](https://github.com/sachudj/vruttaant-app/actions/workflows/release.yml)
[![Latest Release](https://img.shields.io/github/v/release/sachudj/vruttaant-app)](https://github.com/sachudj/vruttaant-app/releases)
[![Coverage](https://codecov.io/gh/sachudj/vruttaant-app/branch/main/graph/badge.svg)](https://codecov.io/gh/sachudj/vruttaant-app)

A multilingual, card-based news app providing a concise "Vruttaant" (chronicle) of local events through a swipable interface.

**Status**: Active Development (v0.3)  
**Last Updated**: May 18, 2026

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
- [Deployment Runbook](./docs/DEPLOYMENT.md) - Environment profiles, rollout/rollback, CI deployment gate

## Tech Stack

**Backend**: Node.js 25.9 + Express 4.21 + Mongoose 8.18 + Cheerio 1.0  
**Database**: MongoDB 7 (Docker)  
**Mobile**: Flutter 3.41 + Dart 3.11  
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
✅ Flutter vertical swipe feed with PageView  
✅ Pull-to-refresh and pull-up pagination  
✅ Next-card image prefetching  
✅ Settings/Profile screen with preferences  
✅ Bookmarks management (add/list/delete)  
✅ Push notifications (FCM + daily digest)  
✅ Multilingual UI (`en`/`hi`) with locale-aware formatting  
✅ Feed caching with TTL and offline fallback  
✅ Translation controls with state badges  
✅ Event tracking service for analytics  

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

**Test Coverage**: 374/374 tests passing ✅  
**Overall Progress**: 10 of 12 tracks complete (83%)

**Completed Tracks:**
- ✅ **Track A** (Security & API Hardening): 9/9 items
- ✅ **Track B** (Authentication & Access Control): 6/6 items
- ✅ **Track C** (Reliability & Observability): 7/7 items
- ✅ **Track D** (Testing & Quality): 7/7 items
- ✅ **Track E** (Data Governance & Feed Quality): 6/6 items
- ✅ **Track F** (Product Milestones): 3/3 milestones
- ✅ **Track G** (Mobile UX Completion): 10/10 items
- ✅ **Track H** (Feed Intelligence): 4/4 items
- ✅ **Track I** (Recommendation Engine): 4/4 items
- ✅ **Track J** (Analytics & User Behavior): 6/6 items

**In Progress:**
- ⏳ **Track K** (User Engagement Features): 0/6 items
- ⏳ **Track L** (Performance Optimization): 0/6 items
  - ✅ B1: User model with secure password storage
  - ✅ B2: JWT signup/login endpoints
  - ✅ B3: Refresh token rotation & revocation
  - ✅ B4: Auth middleware for protected routes
  - ✅ B5: Bookmark endpoints with ownership scoping
  - ✅ B6: Role-based access control with admin endpoints
- **Track C** (Observability): 7/7 (100%) ✅
  - ✅ C1: Structured JSON request logging with request IDs
  - ✅ C2: Request/response timing logs (`durationMs`) for API calls
  - ✅ C3: Readiness probe endpoint at `/ready`
  - ✅ C4: Graceful shutdown with in-flight request draining and DB cleanup
  - ✅ C5: External error tracking integration (Sentry, optional via env)
  - ✅ C6: Metrics export endpoint (`/metrics`) with latency/error counters
  - ✅ C7: Alert rules for uptime, 5xx spikes, and DB disconnects
- **Track D** (Testing): 7/7 (100%) ✅
  - ✅ D1: 272 tests (ingestion, auth, profiles, bookmarks, RBAC, observability)
  - ✅ D2: Integration tests for `/api/v1/news/ingest`
  - ✅ D3: Integration tests for `/api/v1/news/cards`
  - ✅ D4: API contract tests for response-shape stability
  - ✅ D5: Test fixtures and deterministic LLM response mocks
  - ✅ D6: CI coverage threshold gates (Jest global coverage minimums)
  - ✅ D7: Dependency vulnerability checks with CI fail-on-high rule
- **Track E** (Data Governance): 6/6 (100%) ✅
  - ✅ E1: Strict 10-label category taxonomy (`src/constants/categories.js`)
  - ✅ E2: Keyword-based fallback mapping for LLM category variants
  - ✅ E3: Cross-source duplicate detection via title fingerprint (`src/utils/fingerprint.js`)
  - ✅ E4: Source-level quality rules (title length, URL validity, image availability)
  - ✅ E5: Structured audit logs for LLM summary/category failure paths
  - ✅ E6: Reprocessing job for cards missing summary/category (`npm run job:reprocess-missing-metadata`)
- **Track F** (Feature Milestones): 4/4 (100%) ✅
  - ✅ Milestone 1: Secure API Baseline complete
  - ✅ Milestone 2: Authenticated user flows complete (mobile bookmark flow included)
  - ✅ Milestone 3: Production reliability complete
  - ✅ Milestone 4: Data quality at scale complete

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
flutter clean
flutter pub get
flutter run
```

For more help, see [DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Contributing

All documentation is in `docs/` folder. Update relevant doc when making changes.

## License

MIT License - See [LICENSE](./LICENSE) file
