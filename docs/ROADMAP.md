# Product Roadmap

**Date**: May 5, 2026  
**Purpose**: Break down pending work into small, trackable implementation steps.

## How We Will Use This File

1. Pick 1-2 unchecked items per session.
2. Implement and verify (lint/tests/manual check).
3. Mark done and add a short note under "Session Notes".
4. Keep this file as the source of truth for delivery sequencing.

## Track A: Security & API Hardening

- [ ] Add request validation middleware for all API payloads and query params
- [ ] Validate and clamp ingest inputs (`url`, `maxItems`, `language`, `persist`)
- [ ] Validate and clamp cards inputs (`page`, `limit`, `language`, `category`)
- [ ] Add centralized error-handler middleware with consistent JSON error envelope
- [ ] Add `helmet` with secure defaults
- [ ] Restrict CORS to approved origins by environment
- [ ] Add rate limiter for public API routes
- [ ] Add request size limits for JSON payloads
- [ ] Add API versioning prefix (`/api/v1`) and compatibility notes

## Track B: Authentication & Access Control

- [ ] Add user model and secure password hashing
- [ ] Add login/signup endpoints with JWT access token
- [ ] Add refresh token rotation and revocation storage
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

- [ ] Add backend unit tests for ingestion parsing and category normalization
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
