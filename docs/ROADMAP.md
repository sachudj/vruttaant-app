# Product Roadmap

**Date**: May 24, 2026  
**Purpose**: Break down pending work into small, trackable implementation steps.

## Current Status

Tracks A-N completed. Detailed session notes are below. Next phase: Follow-On Optimization.

### Planned Execution Order

- [x] A1. Add request validation middleware for all API payloads and query params
- [x] A2. Validate and clamp ingest inputs (`url`, `maxItems`, `language`, `persist`)
- [x] A3. Validate and clamp cards inputs (`page`, `limit`, `language`, `category`)
- [x] A4. Add centralized error-handler middleware with consistent JSON error envelope
- [x] A5. Add `helmet` with secure defaults
- [x] A6. Restrict CORS to approved origins by environment
- [x] A7. Add rate limiter for public API routes
- [x] A8. Add request size limits for JSON payloads
- [x] A9. Add API versioning prefix (`/api/v1`) and compatibility notes
- [x] D1. Add backend unit tests for ingestion parsing and category normalization

### Definition of Done (Sprint)

- [x] Backend lint passes
- [x] Backend tests pass
- [x] CI workflow passes on main branch
- [x] API docs updated for any request/response changes
- [x] Session Notes updated with completed items and commit hash

### Step Completion Checklist (Per Item)

Use this checklist for every roadmap item (for example: K3, K4, L1).

- [ ] Scope confirmed (single step ID and acceptance criteria documented)
- [ ] Implementation complete (backend/mobile/docs code changes done)
- [ ] Tests added or updated for new behavior
- [ ] Local verification passed
	- [ ] Backend: lint + tests + coverage gates
	- [ ] Mobile: analyze + tests
- [ ] API contract reviewed (request/response shape, validation, error envelope)
- [ ] Documentation updated in same cycle
	- [ ] `docs/ROADMAP.md` step checkbox and session note
	- [ ] `docs/PROJECT_STATUS.md` progress and next-steps updates
	- [ ] Any impacted domain docs (API, backend, mobile, deployment, alerting)
- [ ] Commit and push complete
	- [ ] Commit message references step ID (for example: `K.3:`)
	- [ ] Commit hash copied into session note
	- [ ] Pushed to `main` after checks pass
- [ ] Rollback and risk note captured (what could fail and how to revert quickly)
- [ ] Post-deploy sanity checks completed (health + core flow smoke test)

### Session Note Template (Copy/Paste)

```
- _YYYY-MM-DD_: Completed <STEP_ID> <step title>. 
	- Changes: <key implementation points>
	- Validation: <tests/analyze/lint/coverage summary>
	- Risk/Rollback: <brief note>
	- Commit: `<short_hash>`
```

## How We Will Use This File

1. Pick 1-2 unchecked items per session.
2. Implement and verify (lint/tests/manual check).
3. Mark done and add a short note under "Session Notes".
4. Keep this file as the source of truth for delivery sequencing.

## Track A: Security & API Hardening

- [x] Add request validation middleware for all API payloads and query params
- [x] Validate and clamp ingest inputs (`url`, `maxItems`, `language`, `persist`)
- [x] Validate and clamp cards inputs (`page`, `limit`, `language`, `category`)
- [x] Add centralized error-handler middleware with consistent JSON error envelope
- [x] Add `helmet` with secure defaults
- [x] Restrict CORS to approved origins by environment
- [x] Add rate limiter for public API routes
- [x] Add request size limits for JSON payloads
- [x] Add API versioning prefix (`/api/v1`) and compatibility notes

## Track B: Authentication & Access Control

- [x] Add user model with email uniqueness and secure password hashing
- [x] Add JWT-based login/signup/refresh/logout endpoints
- [x] Add refresh token rotation and revocation tracking
- [x] Add auth middleware for protected routes
- [x] Add bookmark endpoints scoped to authenticated user
- [x] Add role field and role-based route guard for admin operations

## Track C: Reliability & Observability

- [x] Add structured logging (JSON) with request IDs
- [x] Add request/response timing logs for API calls
- [x] Add `/ready` endpoint for readiness checks
- [x] Add graceful shutdown for in-flight requests and DB cleanup
- [x] Add external error tracking integration
- [x] Add metrics export for latency/error rate
- [x] Add alert rules for uptime, 5xx spikes, and DB disconnects

## Track D: Testing & Quality Gates

- [x] Add backend unit tests for ingestion parsing and category normalization
- [x] Add backend integration tests for `/api/news/ingest`
- [x] Add backend integration tests for `/api/news/cards`
- [x] Add API contract tests for response shape stability
- [x] Add test data fixtures and deterministic mocks for LLM responses
- [x] Add minimum coverage threshold gates in CI
- [x] Add dependency vulnerability checks and CI fail rules for high severity

## Track E: Data Governance & Feed Quality

- [x] Define and enforce a strict category taxonomy
- [x] Add fallback mapping for unknown category labels
- [x] Add duplicate detection strategy across sources
- [x] Add source-level quality rules (title length, URL validity, image availability)
- [x] Add audit logs for LLM summary/category generation failures
- [x] Add reprocessing job for cards with missing summary/category

## Track F: Product Milestones

### Milestone 1: Secure API Baseline
- [x] All Track A items 1-9 completed
- [x] Track D item 1 completed (151 unit/integration/contract tests passing)

### Milestone 2: Authenticated User Flows
- [x] All Track B items 1-6 completed
- [x] Bookmark flow available in mobile app

### Milestone 3: Production Reliability
- [x] Track C items 1-7 completed
- [x] Track D items 2-4 completed

### Milestone 4: Data Quality at Scale
- [x] Track E items 1-6 completed
- [x] Track D items 5-7 completed

## Track G: Mobile UX Completion (User-Centric)

- [x] Add dedicated Settings/Profile screen in mobile app
- [x] Add profile preferences editing (language + categories) on mobile
- [x] Add notification preferences and registered-device management UI
- [x] Update story card readability constraints (title cap + larger summary viewport)
- [x] Document user journeys and visual references in `docs/USER_APP_GUIDE.md`
- [x] Add per-story translation control (`Translate` / `Show Original`) on story card
- [x] Add translation state badges (`Original` / `Translated`) and loading/error states
- [x] Add translated-content fallback logic when translation is unavailable
- [x] Add widget and integration tests for translation flow
- [x] Complete localization coverage for core mobile surfaces (feed/settings/auth/bookmarks/reader)

## Track H: Feed Intelligence (Trending & Personalization)

- [x] Add trending score calculation using gravity formula (ingestCount, time decay)
- [x] Add hourly background job for trending score recalculation
- [x] Add soft-auth endpoint support (optionalAuth middleware)
- [x] Add database-driven news source registry with enable/disable controls
- [x] Add schema migration infrastructure with version tracking

## Track I: Recommendation Engine

- [x] Create recommendation scoring service with multi-factor blending (trending × category boost × diversity penalty + bookmark signal)
- [x] Add `GET /api/v1/news/recommended` endpoint with personalization support
- [x] Add query validation for pagination and diversity tracking parameters
- [x] Wire recommendation route with optional authentication
- [x] Add comprehensive unit and integration tests for recommendation logic

## Track J: Analytics & User Behavior Tracking

- [x] J1. Add user activity event model (view, bookmark, translate, share events)
- [x] J2. Add backend event capture middleware (track page views, article interactions)
- [x] J3. Add event aggregation service for content performance metrics
- [x] J4. Add `/api/v1/analytics/events` endpoint for event submission (client + server tracking)
- [x] J5. Add analytics API for editorial dashboard (trending content, user segments, engagement)
- [x] J6. Add mobile event tracking service and integration

## Track K: User Engagement Features

- [x] K1. Add engagement-driven recommendation refinement (boost articles from bookmarked categories)
- [x] K2. Add reading-time estimation on article cards
- [x] K3. Add user activity history/reading feed feature
- [x] K4. Add engagement badges and achievement system (reader milestones)
- [x] K5. Add digest email template generation and scheduling (in addition to push)
- [x] K6. Add user cohort segmentation for A/B testing (language, category, device)

## Track L: Performance Optimization & Caching

- [x] L1. Add Redis caching layer for trending cards and user recommendations
- [x] L2. Add database query optimization (indexing strategy review + execution plans)
- [x] L3. Add image CDN integration for card artwork delivery
- [x] L4. Add API response compression (gzip)
- [x] L5. Add mobile app bundle optimization (lazy loading, tree shaking verification)
- [x] L6. Add comprehensive load testing with regression gates (p95 latency, throughput SLOs)

## Track M: Infrastructure Operations

- [x] M1. Add backup automation and restore runbook
- [x] M2. Add release telemetry dashboard baseline
- [x] M3. Add multi-environment load history and trend analysis

## Track N: Documentation and UX Polish

- [x] N1. API and project status documentation parity sweep + CI guard
- [x] N2. Mobile activity history and reading-feed UI integration
- [x] N3. Secondary localization polish for non-core surfaces
- [x] N4. Publish runtime API docs and importable Postman collection

## Session Notes

- _Add short notes here after each implementation session._
- _May 7, 2026_: Sprint plan created for Secure API Baseline (A1-A8, D1).
- _May 7, 2026_: Completed A1-A3 with reusable validator middleware + sanitized request inputs for `/api/news/ingest` and `/api/news/cards`. Backend lint and syntax checks passed.
- _May 7, 2026_: Completed A4-A5 with centralized `AppError` + global error middleware and Helmet enabled in app bootstrap. Backend lint and syntax checks passed.
- _May 7, 2026_: Completed A6-A7 with environment-based CORS allowlist and API rate limiting (`express-rate-limit`) in app bootstrap. Backend lint and syntax checks passed.
- _May 7, 2026_: Completed A8-D1 with JSON payload size limits (10kb default, configurable via `JSON_PAYLOAD_LIMIT` env var) and 29 unit tests for ingestion service utilities (language/category normalization, date parsing, URL resolution, text cleaning). Jest configured, ESLint updated for Jest globals. All tests passing (29/29). Commit: `a52b89d`.
- _May 7, 2026_: Completed A9 with API v1 versioning. Created `apiRouter.js` to mount routes at `/api/v1/news`. Added backwards compatibility layer at `/api/news` with deprecation warnings. Updated root endpoint to reflect versioning. Added comprehensive API_VERSIONING.md with migration guide, stability guarantees, and v2 timeline. Commit: `266b3fa`.
- _May 7, 2026_: Completed B1-B3 with secure auth baseline: `User` model, password hashing (`bcryptjs`), JWT signup/login, and refresh token rotation + revocation storage in `RefreshToken` model. Added `/api/v1/auth` routes (`signup`, `login`, `refresh`, `logout`) with legacy `/api/auth` compatibility. Backend lint and tests passed. Commit: `9815bd0`.
- _May 7, 2026_: Added dedicated GitHub Actions test job for independent test execution. Updated README with project status section (52/52 tests passing, 12/20 items = 60% complete). Commit: `2e15d5d`.
- _May 7, 2026_: Completed B4 with auth middleware (`verifyAccessToken`, `verifyRefreshToken`, `verifyRefreshTokenNotRevoked`, `verifyUserExists`). Middleware extracts and validates JWT from Authorization headers, verifies token claims, checks token revocation status in RefreshToken storage, and optionally reloads user from database. Comprehensive test suite with 23 new tests (total 52 passing). Commit: `a84730e`.
- _May 7, 2026_: Completed B5 with bookmark feature. Created `Bookmark` model with userId reference and compound unique index (userId + url prevents duplicates). Added `bookmarkController` with createBookmark, listBookmarks, deleteBookmark operations with ownership verification. Added `bookmarkValidators` for payload and query validation. Added protected bookmark routes at `/api/v1/user/bookmarks` with auth middleware. Added 39 comprehensive unit tests for validators and controller (total 91 passing). All tests passing (91/91), lint passed. Commit: `64dc775`.
- _May 7, 2026_: Completed B6 with role-based access control. Created `roleGuard` middleware with `requireRole`, `requireAdmin`, and `requireUser` functions for flexible role checking. Created `adminController` with `getDetailedHealth` and `getSystemStats` endpoints for monitoring and observability. Created protected admin routes at `/api/v1/admin` accessible only to users with admin role. Added 23 comprehensive unit tests for role guard middleware and admin endpoints (total 114 passing). All tests passing (114/114), lint passed. Commit: `b40c803`.
- _May 9, 2026_: Completed C1-C3 observability baseline. Added JSON request logging middleware with `X-Request-Id` propagation and per-request timing (`durationMs`), plus readiness probe at `/ready` that returns `200` when DB is connected and `503` when not ready. Added unit tests for request logger and readiness behavior (total 121 passing). Updated manual smoke checks to include readiness validation. Commit: `2ed1369`.
- _May 9, 2026_: Completed C4 graceful shutdown. Added in-flight request tracking middleware that rejects new requests during shutdown (`503` + `Connection: close`), shutdown-aware readiness (`/ready` reports `not_ready` while draining), and signal handlers for `SIGINT`/`SIGTERM` that drain requests, close HTTP server, and close MongoDB connections with configurable timeout fallback (`GRACEFUL_SHUTDOWN_TIMEOUT_MS`). Added unit tests for graceful shutdown lifecycle (total 126 passing). Commit: `92b3dd2`.
- _May 9, 2026_: Completed C5 external error tracking integration. Added optional Sentry integration initialized at bootstrap via `SENTRY_DSN`, wired 5xx error capture from global error handler with request context (`requestId`, route, method, userId), and included `requestId` in API error payloads for easier correlation. Added tracker and error-handler tests (total 131 passing). Commit: `e92bf75`.
- _May 9, 2026_: Completed C6 metrics export. Added Prometheus-compatible `/metrics` endpoint with default process metrics and custom HTTP metrics (`vruttaant_http_requests_total`, `vruttaant_http_request_duration_seconds`, `vruttaant_http_errors_total`) labeled by method/path/status. Added metrics middleware + unit tests and extended smoke checks to validate metrics output (total 137 passing). Commit: `ea94cb4`.
- _May 9, 2026_: Completed C7 alerting rules. Added Prometheus alert rule spec for backend uptime (`VruttaantBackendDown`), 5xx spike detection (`VruttaantHigh5xxRate`), and DB disconnect (`VruttaantDatabaseDisconnected`) in `docs/alerts/vruttaant-alert-rules.yml` plus runbook guidance in `docs/ALERTING.md`. Added `vruttaant_database_connected` gauge to metrics export to support DB connectivity alerting and extended metrics tests/smoke checks (total 139 passing). Commit: `9a05322`.
- _May 9, 2026_: Completed D2 integration tests for `/api/v1/news/ingest` using Supertest with mocked ingestion/database boundaries. Covered validation failure (`400`), successful ingest with and without persistence, DB-connected persistence path, and DB-disconnected fallback path. Added app export guard in `index.js` (`require.main === module`) for testability without changing runtime startup behavior. Total tests now 143 passing. Commit: `c49c028`.
- _May 9, 2026_: Completed D3 integration tests for `/api/v1/news/cards` using Supertest with mocked query chain on `NewsCard.find()`. Covered query validation failure (`400`), DB unavailable behavior (`503`), pagination metadata (`page`, `limit`, `totalPages`, `hasMore`), language normalization, and category filter regex behavior. Total tests now 147 passing. Commit: `fd70a6a`.
- _May 9, 2026_: Completed D4 API contract tests for response shape stability. Added contract-focused suite for `/api/v1/news/ingest` and `/api/v1/news/cards` covering success payload keys/types and standardized error envelope keys (`success`, `error`, `statusCode`, `message`, `details`, `requestId`) under production-mode error shaping. Total tests now 151 passing. Commit: pending.
- _May 9, 2026_: Completed D5 with reusable test fixtures and deterministic LLM mocks. Added HTML source fixture and fixed LLM provider response fixtures, then added fixture-driven tests for `summarizeWithLlm` (valid JSON, plain-text fallback, provider error) and `fetchNewsCards` parsing flow. Total tests now 155 passing. Commit: pending.
- _May 9, 2026_: Completed D6 by enforcing backend Jest global coverage thresholds (statements 70%, branches 60%, functions 70%, lines 70%) and wiring CI backend test job to run coverage mode so threshold violations fail pull requests. Verified coverage run remains green (155/155 tests). Commit: pending.
- _May 9, 2026_: Completed D7 by adding an explicit backend CI dependency audit gate (`npm audit --audit-level=high`) that fails builds on high/critical vulnerabilities. Added reusable backend script (`security:audit`) and verified local audit currently reports zero vulnerabilities. Commit: b31351f.
- _May 9, 2026_: Completed E1+E2 together. Created `backend/src/constants/categories.js` with the canonical 10-label taxonomy (Tech, Politics, Sports, Business, World, Health, Entertainment, Science, Education, General) and a keyword-based fallback map covering common LLM-produced variants. Replaced the ad-hoc `normalizeCategory` function in `newsIngestionService.js` with `normalizeToTaxonomy`, enforcing strict taxonomy membership with graceful fallback to 'General'. Added 73 new tests in `__tests__/categories.test.js` covering exact matches (all cases/capitalizations), keyword fallback (33 cases), and empty/unknown/null inputs. Total tests now 228 passing. Commit: ce9edd4.
- _May 9, 2026_: Completed E3 cross-source duplicate detection. Added `backend/src/utils/fingerprint.js` with `computeTitleFingerprint(title)` (lowercase, strip punctuation, collapse whitespace, truncate to 120 chars). Added `titleFingerprint` field + `{ titleFingerprint, language }` compound index to `NewsCard` schema. Updated `newsIngestionService.js` to attach fingerprints to every parsed card. Updated ingest controller to query existing fingerprints before bulk-write and skip cards whose fingerprint is already stored in the DB, preventing duplicate stories from different source URLs. Added `dedupSkippedCount` to ingest response. Added 11 fingerprint unit tests and 1 cross-source dedup integration test; updated API contract test for new response shape and card preview fields. Total tests now 240 passing. Commit: `74434be`.
- _May 9, 2026_: Completed E4 source-level quality rules in ingestion parsing. Added shared quality validation in `newsIngestionService.js` for title length (25-180 chars), valid HTTP(S) article URL, and required valid HTTP(S) image URL. Parsing now filters low-quality cards before LLM processing/persistence. Added unit tests for quality rules and fixture-driven parser tests verifying invalid cards are dropped. Total tests now 245 passing. Commit: `788d8e0`.
- _May 9, 2026_: Completed E5 audit logging for LLM summary/category failure paths. Added `src/observability/auditLogger.js` for structured audit JSON logs, then wired ingestion service to log events for provider error responses (`llm_summary_category_provider_error`), invalid JSON model output (`llm_summary_category_invalid_json`), and runtime enrichment exceptions (`llm_summary_category_enrichment_failed`). Added unit tests for audit logger and fixture-driven service tests that assert logs are emitted for each failure path. Total tests now 248 passing. Commit: `8540bc1`.
- _May 9, 2026_: Completed E6 reprocessing job for cards missing summary/category. Added `src/jobs/reprocessMissingMetadata.js` with DB-aware batch reprocessing (query missing metadata, call `summarizeWithLlm`, update cards, continue on per-card failures). Added npm script `job:reprocess-missing-metadata` for operational execution and failure counters (`scanned`, `updated`, `skipped`, `failed`). Added dedicated job unit tests with mocked DB/LLM behavior including failure-path audit logging. Total tests now 253 passing. Commit: `55f99c1`.
- _May 9, 2026_: Completed Milestone 2 mobile bookmark flow. Added authenticated bookmark integration in Flutter app (`mobile_app`) with per-card bookmark toggle, bookmarks list sheet, delete action, and tap-to-open bookmarked stories. Extended mobile API client with `/api/v1/user/bookmarks` create/list/delete methods using `API_ACCESS_TOKEN` (`--dart-define`). Verified with `flutter analyze` and `flutter test` passing. Commit: `2b8a78f`.
- _May 9, 2026_: Completed backend User Profile and Preferences API. Added `preferences` field to `User` schema. Implemented `GET /api/v1/user/profile` and `PATCH /api/v1/user/profile` with robust input validation and taxonomy normalization for categories. Added comprehensive unit tests ensuring backward compatibility and strict error handling. Total backend tests passing: 265. Commit: `a14f2b3`.
- _May 9, 2026_: Integrated backend profile preferences into the Flutter mobile app. Updated `NewsApiService` to fetch and update language preferences. Wired the language settings sheet to sync selections with the backend and reload the feed. All lint checks and widget tests passing. Commit: `d55588e`.
- _May 9, 2026_: Completed advanced cards search/sort API. Added `q` full-text query and `sort` (`latest`/`relevance`) support in `/api/v1/news/cards`, wired validation for new query params, and added Mongo text index for searchable card fields (`title`, `summary`, `aiSummary`, `source`). Expanded integration/contract tests and added validator unit tests. Commit: `b2861e7`.
- _May 9, 2026_: Completed mobile feed search/sort controls. Added Search & Sort bottom sheet in Flutter feed UI, wired search query + sort mode to cards API requests, and extended widget tests for the interaction flow. Flutter analyze/tests passing. Commit: `eb992db`.
- _May 9, 2026_: Completed security checklist follow-up for SAST/container scanning and secrets governance. Added `.github/workflows/security.yml` with CodeQL (SAST) and Trivy (vuln/secret/misconfig) scans plus `docs/SECRETS_POLICY.md` for environment separation, rotation, and incident response policy. Commit: pending.
- _May 9, 2026_: Completed push-notification backend foundation. Added user notification preferences schema defaults, notification-device model, and authenticated user endpoints for preferences and device registration/list/delete under `/api/v1/user/notifications/*`, including input validators and integration tests. Verified backend tests (282 passing) and smoke checks (`PASS=33 FAIL=0 SKIP=1`). Commit: `0d0612e`.
- _May 9, 2026_: Completed mobile notification preferences integration. Extended Flutter settings sheet with authenticated notification toggles (enable, breaking news, bookmark alerts, daily digest) and server-backed load/save flows via `/api/v1/user/notifications/preferences`. Added `NewsApiService` methods + dedicated service tests and updated widget settings test flow. Verified backend tests, `flutter analyze`, `flutter test`, and smoke checks. Commit: pending.
- _May 13, 2026_: Completed Push Notification Delivery System. Implemented backend FCM wrapper `PushNotificationService` with graceful fallback to mock mode if credentials are missing. Created `POST /api/v1/admin/notifications/send` for manual push broadcasts. Created `dailyDigestWorker` cron job to automatically send customized top stories to users with `dailyDigest` preference enabled. Integrated `firebase_core` and `firebase_messaging` in the Flutter mobile app, configured `PushNotificationService` to extract the device token and register it with the backend upon initialization. Complete end-to-end foundation established.
- _May 17, 2026_: Completed mobile UX progression for settings/profile. Replaced settings bottom sheet with dedicated Settings/Profile page, added category preference editing, notification-device list/delete management, and sign-in/sign-out account controls. Verified with `flutter analyze` and `flutter test`. Commit: `7c0d824`.
- _May 17, 2026_: Updated content-readability behavior and user-facing documentation. Enforced backend summary range defaults (45-75 words, target ~60), expanded mobile story summary rendering viewport (~48% height cap), and created a presentable user guide with visual screen references (`docs/USER_APP_GUIDE.md` + screenshots). Commit: `d043861`.
- _May 18, 2026_: Completed translation UX + mobile resilience foundation. Added `/api/v1/news/translate` backend contract, mobile Translate/Show Original controls with badge/error/fallback states, reader parity rendering, and test coverage. Added feed cache service with TTL, cached-first startup, and offline fallback badge. Added app-level theme mode persistence and localization scaffolding (`en`/`hi`) with analyzer-safe CI checks. Commits: `0b0cddc`, `6001639`, `258c016`.
- _May 18, 2026_: Expanded localization from foundation to core app surfaces. Localized search/sort, auth/login prompts, bookmark flows, feed/error states, settings/account/notifications/device text, category and language labels, and reader translation labels/tooltips. Added/updated widget assertions for Hindi labels after language switch. Verified mobile (`flutter analyze`, `flutter test --coverage -r compact`) and backend CI-equivalent checks before commit. Commit: pending.
- _May 18, 2026_: Added locale-aware cached-feed time formatting via `MaterialLocalizations.formatTimeOfDay` and expanded language-switch smoke coverage to assert Hindi search-surface labels post-switch. Re-verified mobile (`flutter analyze`, `flutter test --coverage -r compact`) and backend CI-equivalent checks. Commit: pending.
- _May 18, 2026_: Started modularization of oversized `mobile_app/lib/main.dart` by extracting `StoryPager` and `SettingsProfilePage` into feature modules under `mobile_app/lib/features/reader/presentation/` and `mobile_app/lib/features/settings/presentation/`. Re-verified mobile and backend CI-equivalent checks. Commit: pending.
- _May 18, 2026_: Completed feed extraction from oversized `mobile_app/lib/main.dart` by moving `NewsFeedPage` orchestration/UI into `mobile_app/lib/features/feed/presentation/news_feed_page.dart` and shared typedefs into `mobile_app/lib/features/feed/domain/feed_types.dart`. Updated app shell imports/wiring and re-verified mobile and backend CI-equivalent checks (including audit gate behavior with explicit exit code validation). Commit: `89424c3`.
- _May 18, 2026_: Added backend load-test baseline runner (`backend/src/loadtest/runBaseline.js`) with repeatable scenarios for cards read, translate, and optional authenticated bookmark reads, plus initial SLO targets (p95 latency, throughput, error rate) documented in `docs/LOAD_TESTING.md`. Added npm scripts (`loadtest:baseline`, `loadtest:baseline:strict`). Commit: pending.
- _May 18, 2026_: Completed production deployment readiness baseline. Added backend staging/production environment templates (`backend/.env.staging.example`, `backend/.env.production.example`), mobile environment define templates (`mobile_app/env/staging.json`, `mobile_app/env/production.json`), deployment runbook (`docs/DEPLOYMENT.md`), and CI deployment gate workflow (`.github/workflows/deploy-gate.yml`) with smoke checks plus strict SLO baseline verification. Commit: pending.
- _May 18, 2026_: Completed Track J backend analytics foundation (J1-J5). Created `UserActivityEvent` model with TTL auto-purge (90 days), event capture middleware (non-blocking async), analytics service with trending/categories/engagement aggregations, and controller endpoints: POST `/api/v1/analytics/events` (soft-auth for client event submission), GET `/api/v1/analytics/trending` (admin, sorted by views), GET `/api/v1/analytics/categories` (admin, engagement-ranked), GET `/api/v1/analytics/card/:id/metrics` (admin), GET `/api/v1/analytics/user/engagement` (auth user profile). Added 60+ tests across 3 test files (validators, service unit, integration). Coverage 74.19% statements, 67.32% branches. Commit: `4a35547`.
- _May 18, 2026_: Completed J6 mobile analytics event tracking integration. Added `mobile_app/lib/services/event_tracking_service.dart` and wired feed-side tracking for story views (with duration), bookmark, translate, and share actions via `POST /api/v1/analytics/events` using optional auth. Updated mobile models/API client to include backend card IDs for analytics payloads and added in-app share action wiring. Verified with `flutter analyze` and `flutter test -r compact` (18/18 passing). Commit: pending.
- _May 19, 2026_: Completed K.1 engagement-driven recommendation refinement. Added `getEngagedCategories()` function to identify user's top 3 most-bookmarked categories. Enhanced `computeRecommendationScore()` with 1.3x engagement boost multiplier for articles in engaged categories (applied separately from 2x preference boost, combining multiplicatively). Updated `getRecommendedCards()` to compute engaged categories for authenticated users. Added 10 comprehensive unit and integration tests covering engagement boost logic and edge cases. All 402 backend tests passing. Feature automatically boosts articles from categories where user shows high engagement (frequent bookmarks), improving recommendation relevance for active users. Commit: `2d33652`.
- _May 19, 2026_: Completed K.4 engagement badges and achievement system. Created `Badge` model (badge definitions: id, name, description, category, icon, color, tier, criteria with threshold/operator) and `UserBadge` model (tracks earned badges per user with earnedAt, viewedAt, progress). Implemented `badgeService.js` with 12 pre-seeded badges across 6 categories (views, categories, bookmarks, translations, shares, engagement) in 4 tiers (bronze, silver, gold, platinum). Functions: `initializeBadgeDefinitions()` (upsert-based seed at startup), `getUserEngagementMetrics()`, `checkBadgeCriteria()`, `evaluateAndAwardBadges()`, `getUserBadges()`, `getUserBadgeProgress()` (progress % toward unearned badges), `getBadgeCatalog()`, `markBadgeAsViewed()`. Added 6 endpoints: GET `/api/v1/user/badges` (earned badges), GET `/api/v1/user/badges/progress` (progress toward all badges with completionPercent), POST `/api/v1/user/badges/evaluate` (trigger evaluation), POST `/api/v1/user/badges/:badgeId/view` (mark viewed), GET `/api/v1/user/badges/metrics` (engagement metrics), GET `/api/v1/badges/catalog` (public, no auth). Added 47 tests (badgeService.test.js + badgeController.test.js) with full jest.mock() pattern. All 481 backend tests passing. Commit: pending. Created `backend/src/services/readingTimeService.js` with word-counting and reading-time calculation (200 words/minute baseline, 1-minute minimum). Integrated into three endpoints: `/api/v1/news/cards`, `/api/v1/news/recommended`, `/api/v1/news/translate`. Updated `mobile_app/lib/models/news_item.dart` to parse `readingTime` field from API. Enhanced `NewsCard` widget to display "X min read" badge with clock icon in metadata. Added 32 comprehensive backend tests and updated widget tests. All 434 backend tests passing, 18 mobile tests passing, 0 lint issues. Deployed to main branch. Commit: `c66639c`.
- _May 19, 2026_: Completed K.3 user activity history and reading feed backend. Created `backend/src/services/userActivityService.js` with four core functions: `getUserActivityHistory(userId, page, limit, filters)` for paginated activity with optional eventType/language/category/date filtering, `getReadingFeed(userId, limit)` for user's reading history (view events) sorted by recency, `getUserActivityStats(userId)` for engagement aggregation (total views/bookmarks/shares/translations, top categories/languages, last activity timestamp), and `getCardActivityMetrics(newsCardId, limit)` for article-level engagement insights. Integrated into `userController.js` with three new endpoints: GET `/api/v1/user/activity/history?page=1&limit=20&eventType=view&language=en&category=Tech` (paginated activity), GET `/api/v1/user/activity/reading-feed?limit=20` (reading feed for recency-sorted views), GET `/api/v1/user/activity/stats` (user engagement statistics). Added comprehensive input validation, error handling, and query optimization. All backend tests passing (434/434, 76.66% statement coverage). Feature enables user engagement tracking, personalized reading history, and engagement metrics for analytics. Mobile UI endpoints ready for integration; full mobile implementation deferred to future polish pass. Commit: pending.
- _May 19, 2026_: Completed K.5 digest email template generation and scheduling. Created `digestEmailService.js` with HTML template builder (`buildDigestEmailHtml`), plain-text fallback (`buildDigestEmailText`), and `sendDigestEmail` function using nodemailer with configurable SMTP transport (env vars: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_SECURE`, `EMAIL_FROM`). Service gracefully falls back to mock/no-op mode when `EMAIL_HOST` is not configured — same pattern as `pushNotificationService`. Template features: branded HTML with gradient header, per-story category badge, summary truncation at 180 chars, XSS-safe HTML escaping via `escapeHtml`. Extended `dailyDigestWorker.js` to send email digest in parallel with existing push notifications per opted-in user; per-user email errors are caught individually so one failure doesn't abort the batch. Added `emailsSent` counter to job completion log. Added 36 new tests across `digestEmailService.test.js` (21 tests: escapeHtml, HTML/text template, createTransporter, sendDigestEmail) and `dailyDigestWorker.test.js` (7 tests: early-exit, push+email happy path, no-device user, no-email user, per-user error isolation, invalid-token cleanup, DB failure resilience). All 509 backend tests passing. Commit: pending.
- _May 19, 2026_: Completed K.6 user cohort segmentation for A/B testing. Created `UserCohort` Mongoose model with compound unique index `(userId, cohortId)`. Implemented `cohortService.js` with five cohort types: `language_<lang>` (from user language preference), `category_<slug>` (per preferred category, slugified), `device_<platform>` (per unique registered device platform), `engagement_multi_category` (3+ preferred categories), `engagement_no_device` (no registered push devices). Added `assignUserToCohorts(userId)` (upserts desired cohorts, deletes stale ones), `getUserCohorts`, `getCohortStats` (aggregate counts via MongoDB pipeline), `getCohortUsers` (paginated). Added `cohortController.js` with four endpoints wired into existing routers: GET/POST `/api/v1/user/cohorts` (auth user), GET `/api/v1/admin/cohorts/stats` and GET `/api/v1/admin/cohorts/:cohortId/users` (admin). Added 35 tests across `cohortService.test.js` and `cohortController.test.js`. All 544 backend tests passing. Track K complete (6/6). Commit: pending.
- _May 19, 2026_: Completed L.1 Redis caching layer for feed and analytics reads. Added Redis 7 service to `docker-compose.yml`, `ioredis` client bootstrap with graceful no-op fallback when `REDIS_URL` is unset, shared cache helpers with TTL controls, and cache-backed responses for `/api/v1/news/cards`, `/api/v1/news/recommended`, `/api/v1/analytics/trending`, and `/api/v1/analytics/categories`. Added cache invalidation after successful ingest persistence and exposed `cacheConnected` on `/health`. Added unit tests for Redis config/cache helpers and verified lint plus focused backend cache tests. Commit: `eceb78b`.
- _May 19, 2026_: Completed L.2 database query optimization (indexing strategy review + execution plans).
	- Changes: Extended the initial L2 slice by replacing badge metrics full-event loads with a single indexed aggregation, then added compound indexes for badge catalog ordering, user/admin cohort listings, and active device lookups used during cohort assignment. Documented repeatable `explain('executionStats')` checks for feed, recommendation, activity, and cohort query shapes.
	- Validation: Focused badge/cohort tests passed (54/54), followed by full backend and mobile verification.
	- Risk/Rollback: New indexes increase write amplification slightly on affected collections; rollback is limited to removing the added indexes and restoring the prior badge metrics query path.
	- Commit: `b481379`.
- _May 19, 2026_: Completed L.3 image CDN integration for card artwork delivery.
	- Changes: Added configurable CDN URL rewriting for `imageUrl` at the backend response boundary, covering news card listings, recommendations, ingest previews, and bookmark responses while keeping stored source URLs unchanged. Added `IMAGE_CDN_BASE_URL`/`IMAGE_CDN_URL_TEMPLATE` env hooks plus default width/quality controls.
	- Validation: Focused backend Jest validation passed for `imageCdnService`, news cards integration, and bookmark controller coverage (37/37).
	- Risk/Rollback: Misconfigured CDN envs will fall back to original source URLs or malformed CDN URLs in responses only; rollback is isolated to response-layer rewrite logic.
	- Commit: `4e55af7`.
- _May 20, 2026_: Completed L.4 API response compression.
	- Changes: Added Express response compression middleware with a default 1 KB threshold, `RESPONSE_COMPRESSION_THRESHOLD_BYTES` override support, and `/metrics` exclusion to avoid compressing Prometheus scrape output.
	- Validation: Focused backend Jest validation passed for gzip behavior on large `/api/v1/news/cards` responses and non-compression on small `/health` responses.
	- Risk/Rollback: Compression increases CPU work on larger responses; rollback is isolated to middleware removal or threshold adjustment.
	- Commit: pending.
- _May 20, 2026_: Completed L.5 mobile app bundle optimization.
	- Changes: Lazy-loaded the reader pane by switching `StoryPager` to builder-based paging and creating the `WebViewController` only when the reader tab is opened. Added repeatable Android size-analysis workflow via `scripts/check-mobile-bundle-size.sh`, documented the required single-ABI `--target-platform` usage for Flutter analyze-size builds, extended CI to upload mobile size-analysis artifacts for Android arm64 release builds, and enforced a tighter 20 MB arm64 APK budget with repo-local copy of the generated size-analysis JSON.
	- Validation: Focused Flutter widget tests passed for feed/reader behavior. Verified the release size-analysis workflow and confirmed Flutter requires single-ABI analyze-size commands such as `flutter build apk --release --analyze-size --target-platform android-arm64`. Validated CI YAML parsing and helper script syntax after wiring the artifact upload path. Measured current arm64 APK size at 19,298,478 bytes, which passes the 20 MB budget.
	- Risk/Rollback: Reader initialization now occurs on first reader swipe instead of card mount; rollback is isolated to `StoryPager` paging logic and the helper script.
	- Commit: pending.
- _May 24, 2026_: Completed M.1 backup automation and restore runbook baseline.
	- Changes: Added `scripts/backup-mongodb.sh`, `scripts/restore-mongodb.sh`, and `scripts/verify-backup-restore.sh` for archive backups, checksum validation, retention pruning, and restore-drill verification. Wired backend npm scripts (`infra:backup`, `infra:restore`, `infra:backup:verify`) and added backup env template `backend/.env.backup.example`.
	- Validation: Added deterministic restore verification flow over isolated `vruttaant_backup_verify` DB and dry-run restore mode for operator safety.
	- Risk/Rollback: Backup/restore logic is isolated to scripts and docs; rollback is limited to removing script wiring without runtime API impact.
	- Commit: pending.
- _May 24, 2026_: Completed M.2 release telemetry dashboard baseline.
	- Changes: Added admin endpoint `GET /api/v1/admin/release-telemetry` with compact release-health payload (version/env/uptime, DB/cache connectivity, HTTP traffic/error/latency metrics, and 24h engagement/content aggregates). Added Prometheus registry snapshot helper `getMetricsSnapshot()` in observability metrics module.
	- Validation: Backend lint and focused Jest suites passed for telemetry/metrics (`__tests__/adminController.test.js`, `__tests__/metrics.test.js`).
	- Risk/Rollback: Changes are additive to admin-only surfaces; rollback is isolated to route/controller/helper removal without affecting user-facing APIs.
	- Commit: pending.
- _May 24, 2026_: Completed M.3 multi-environment load history and trend analysis.
	- Changes: Added `LoadTestRun` persistence model and admin endpoints `POST /api/v1/admin/loadtest/runs`, `GET /api/v1/admin/loadtest/history`, and `GET /api/v1/admin/loadtest/trends`. Extended baseline runner to emit environment-scoped JSON reports and optionally publish results to the backend with admin auth.
	- Validation: Added controller unit tests for run ingestion/history/trend aggregation (`__tests__/loadtestController.test.js`) and re-verified related suites.
	- Risk/Rollback: Changes are additive and admin-scoped; rollback is isolated to load-test model/controller/route wiring and report-publish behavior in baseline runner.
	- Commit: pending.
- _May 24, 2026_: Completed N.1 docs parity sweep and CI docs guard.
	- Changes: Rebuilt `docs/API_ENDPOINTS.md` to current v1 contracts (news/auth/user/bookmarks/analytics/admin/badges), updated project next-step status framing, and added `scripts/check-api-docs.sh` wired into `.github/workflows/ci.yml`.
	- Validation: Script-based docs parity check verifies required v1 endpoints and blocks stale claims (for example `v0` markers and "not implemented" auth/rate-limit assertions).
	- Risk/Rollback: Documentation and CI check changes are isolated; rollback is limited to docs and one CI step.
	- Commit: `0313ff4`.
- _May 24, 2026_: Completed N.2 mobile activity history and reading-feed UI integration.
	- Changes: Added mobile API methods for `/api/v1/user/activity/stats` and `/api/v1/user/activity/reading-feed`, surfaced activity overview metrics plus recent reading feed inside the Settings/Profile page, and added localization keys for the new surface (`en`/`hi`).
	- Validation: `flutter test test/news_api_service_test.dart` passing with new service coverage for activity stats and reading feed.
	- Risk/Rollback: Feature is read-only UI integration on existing APIs; rollback is isolated to mobile settings/activity rendering and API client methods.
	- Commit: `0313ff4`.
- _May 24, 2026_: Completed N.3 secondary localization polish for non-core surfaces.
	- Changes: Removed hardcoded fallback English copy in shared card UI, localized reading-time label rendering, replaced raw backend exception text with safe localized feedback in feed/settings error surfaces, and corrected docs API base URL to the backend default (`5000`).
	- Validation: `flutter analyze`, targeted `flutter test`, and docs parity script checks pass.
	- Risk/Rollback: Changes are presentation-layer and docs-only; rollback is limited to mobile localization strings and UI messaging paths.
	- Commit: `d61a894`.
- _May 24, 2026_: Completed N.4 runtime API docs and Postman import bundle.
	- Changes: Added OpenAPI spec source (`backend/src/docs/openapi.js`), mounted Swagger UI (`/api/docs`) and JSON spec (`/api/docs.json`), and published importable Postman collection at `docs/Vruttaant.postman_collection.json`.
	- Validation: Local docs routes verified on fallback port and Postman collection includes all current v1 route groups.
	- Risk/Rollback: Additive docs/tooling surface only; rollback is isolated to docs routes and spec assets.
	- Commit: `72c0c72`.
- _May 24, 2026_: Expanded source-registry coverage with India-focused multilingual defaults.
	- Changes: Added migration `003_expand_news_sources_india` to seed reliable Indian news sources for all supported languages (`en`, `hi`, `bn`, `mr`, `te`, `ta`, `gu`, `ur`, `kn`, `or`, `ml`) and wired migration runner to version 3.
	- Validation: Migration is additive (`$setOnInsert`) and safe to re-run; existing source records are not overwritten.
	- Risk/Rollback: If a source has parsing or access issues, disable that source row without code rollback; migration rollback is isolated to deleting inserted source rows.
	- Commit: pending.

## Track O: Social Authentication (Planned)

- [x] O1. Extend user identity model for social providers with backward compatibility
- [x] O2. Add `POST /api/v1/auth/social` (Google/Apple token verification + JWT issuance)
- [x] O3. Add mobile Google sign-in integration (provider SDK + backend exchange)
- [x] O4. Add mobile Apple sign-in integration (provider SDK + backend exchange)
- [x] O5. Add security hardening checks (audience/issuer/nonce/linking policy)
- [ ] O6. Add backend/mobile tests and contract parity checks for social auth
- [ ] O7. Update docs (`API_ENDPOINTS`, `BACKEND`, `MOBILE_APP`, `SECRETS_POLICY`) + Postman

Reference plan: `docs/SOCIAL_AUTH_PLAN.md`

- _May 24, 2026_: Completed O1 social-auth compatibility baseline.
	- Changes: Updated `User` schema to support social identity linkage (`authProviders.googleSub`, `authProviders.appleSub`) while preserving existing email/password users, and made `passwordHash` optional for future social-only users. Hardened password login path to reject users without a password hash safely.
	- Validation: `npm test -- __tests__/authController.test.js` (18/18 passing), including new test case for social-only account password-login rejection.
	- Risk/Rollback: Schema additions are backward compatible; rollback is isolated to removing new provider fields and restoring `passwordHash` requirement.
	- Commit: pending.
- _May 24, 2026_: Completed O2 social auth endpoint baseline.
	- Changes: Added `POST /api/v1/auth/social` with payload validation (`provider`, `idToken`, `nonce`) and provider verification service (`socialAuthService`) for Google tokeninfo verification and Apple identity-token/JWKS verification. Added account linking by provider subject first, with email fallback, then reused existing JWT access/refresh issuance.
	- Validation: `npm test -- __tests__/authValidators.test.js __tests__/authController.test.js` (44/44 passing).
	- Risk/Rollback: Endpoint is additive; rollback is isolated to auth route/controller/service wiring.
	- Commit: pending.
- _May 24, 2026_: Completed O3 mobile Google sign-in integration baseline.
	- Changes: Added `google_sign_in` dependency, implemented `AuthService.loginWithGoogle()` + reusable social token exchange method, and added Google sign-in action to login sheet UI.
	- Validation: `flutter analyze` on touched auth/localization/UI files and `flutter test test/auth_service_test.dart` (2/2 passing).
	- Risk/Rollback: Runtime sign-in still requires platform OAuth client configuration (Android/iOS) for id-token issuance; rollback is isolated to mobile auth service and login sheet changes.
	- Commit: pending.
- _May 24, 2026_: Completed O4 mobile Apple sign-in integration baseline.
	- Changes: Added `sign_in_with_apple` dependency, implemented `AuthService.loginWithApple()` (nonce-based flow) and Apple sign-in login-sheet action. Hardened backend Apple nonce validation to accept either raw nonce or SHA-256 hashed nonce claim formats.
	- Validation: `flutter analyze` (touched files), `flutter test test/auth_service_test.dart` (3/3 passing), backend auth tests (`44/44`) and backend lint (no new errors).
	- Risk/Rollback: Runtime Apple sign-in still depends on iOS capability/provisioning and service ID setup; rollback is isolated to auth service/login sheet/provider verification nonce logic.
	- Commit: pending.
- _May 24, 2026_: Completed O5 social-auth security hardening.
	- Changes: Added one-time nonce replay protection for Apple login (`SocialAuthNonce` + `socialAuthSecurityService`) and introduced explicit email-linking policy (`SOCIAL_AUTH_AUTO_LINK_BY_EMAIL`, disabled by default) with verified-email requirements for first-time social account creation and email-based account linking.
	- Validation: `npm test -- __tests__/authController.test.js __tests__/authValidators.test.js __tests__/socialAuthSecurityService.test.js` (54/54 passing).
	- Risk/Rollback: Replay defense now depends on nonce persistence writes; rollback is isolated to social nonce model/service wiring and controller policy checks.
	- Commit: pending.
