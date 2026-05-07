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

- [x] Add user model and secure password hashing
- [x] Add login/signup endpoints with JWT access token
- [x] Add refresh token rotation and revocation storage
- [ ] Add auth middleware for protected routes
- [ ] Add bookmark endpoints scoped to authenticated user
- [ ] Add role field and role-based route guard for admin operations

## Track C: Reliability & Observability

- [ ] Add structured logging (JSON) with request IDs
- [ ] Add request/response timing logs for API calls
- [ ] Add `/ready` endpoint for readiness checks
- [ ] Add graceful shutdown for in-flight requests and DB cleanup
- [ ] Add external error tracking integration
- [ ] Add metrics export for latency/error rate
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
- [ ] Tracks A items 1-8 completed
- [ ] Track D item 1 completed

### Milestone 2: Authenticated User Flows
- [ ] Track B items 1-6 completed
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
- _May 7, 2026_: Completed B1-B3 with secure auth baseline: `User` model, password hashing (`bcryptjs`), JWT signup/login, and refresh token rotation + revocation storage in `RefreshToken` model. Added `/api/v1/auth` routes (`signup`, `login`, `refresh`, `logout`) with legacy `/api/auth` compatibility. Backend lint and tests passed.
