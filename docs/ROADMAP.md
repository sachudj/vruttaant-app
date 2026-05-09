# Product Roadmap

**Date**: May 5, 2026  
**Purpose**: Break down pending work into small, trackable implementation steps.

## Current Sprint (May 7 to May 14): Secure API Baseline

Goal: complete Milestone 1 by finishing Track A items 1-8 and Track D item 1.

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
- [ ] Backend tests pass
- [ ] CI workflow passes on main branch
- [ ] API docs updated for any request/response changes
- [ ] Session Notes updated with completed items and commit hash

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
- [ ] Add alert rules for uptime, 5xx spikes, and DB disconnects

## Track D: Testing & Quality Gates

- [x] Add backend unit tests for ingestion parsing and category normalization
- [ ] Add backend integration tests for `/api/news/ingest`
- [ ] Add backend integration tests for `/api/news/cards`
- [ ] Add API contract tests for response shape stability
- [ ] Add test data fixtures and deterministic mocks for LLM responses
- [ ] Add minimum coverage threshold gates in CI
- [ ] Add dependency vulnerability checks and CI fail rules for high severity

## Track E: Data Governance & Feed Quality

- [ ] Define and enforce a strict category taxonomy
- [ ] Add fallback mapping for unknown category labels
- [ ] Add duplicate detection strategy across sources
- [ ] Add source-level quality rules (title length, URL validity, image availability)
- [ ] Add audit logs for LLM summary/category generation failures
- [ ] Add reprocessing job for cards with missing summary/category

## Track F: Product Milestones

### Milestone 1: Secure API Baseline
- [x] All Track A items 1-9 completed
- [x] Track D item 1 completed (137 unit tests passing)

### Milestone 2: Authenticated User Flows
- [x] All Track B items 1-6 completed
- [ ] Bookmark flow available in mobile app

### Milestone 3: Production Reliability
- [ ] Track C items 1-7 completed
- [ ] Track D items 2-4 completed

### Milestone 4: Data Quality at Scale
- [ ] Track E items 1-6 completed
- [ ] Track D items 5-7 completed

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
- _May 9, 2026_: Completed C6 metrics export. Added Prometheus-compatible `/metrics` endpoint with default process metrics and custom HTTP metrics (`vruttaant_http_requests_total`, `vruttaant_http_request_duration_seconds`, `vruttaant_http_errors_total`) labeled by method/path/status. Added metrics middleware + unit tests and extended smoke checks to validate metrics output (total 137 passing). Commit: pending.
