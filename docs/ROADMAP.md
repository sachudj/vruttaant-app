# Product Roadmap

**Date**: May 18, 2026  
**Purpose**: Break down pending work into small, trackable implementation steps.

## Current Status

Tracks A-J completed. Detailed session notes are below. Next phase: Tracks K (User Engagement) and L (Performance Optimization).

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
- [ ] K2. Add reading-time estimation on article cards
- [ ] K3. Add user activity history/reading feed feature
- [ ] K4. Add engagement badges and achievement system (reader milestones)
- [ ] K5. Add digest email template generation and scheduling (in addition to push)
- [ ] K6. Add user cohort segmentation for A/B testing (language, category, device)

## Track L: Performance Optimization & Caching

- [ ] L1. Add Redis caching layer for trending cards and user recommendations
- [ ] L2. Add database query optimization (indexing strategy review + execution plans)
- [ ] L3. Add image CDN integration for card artwork delivery
- [ ] L4. Add API response compression (gzip)
- [ ] L5. Add mobile app bundle optimization (lazy loading, tree shaking verification)
- [ ] L6. Add comprehensive load testing with regression gates (p95 latency, throughput SLOs)

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
- _May 19, 2026_: Completed K.2 engagement-driven recommendation refinement. Added `getEngagedCategories()` function to identify user's top 3 most-bookmarked categories. Enhanced `computeRecommendationScore()` with 1.3x engagement boost multiplier for articles in engaged categories (applied separately from 2x preference boost, combining multiplicatively). Updated `getRecommendedCards()` to compute engaged categories for authenticated users. Added 10 comprehensive unit and integration tests covering engagement boost logic and edge cases. All 402 backend tests passing. Feature automatically boosts articles from categories where user shows high engagement (frequent bookmarks), improving recommendation relevance for active users.
