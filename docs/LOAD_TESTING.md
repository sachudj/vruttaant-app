# Backend Load Testing and SLO Baseline

## Purpose

This document defines a repeatable backend load-test baseline and initial Service Level Objectives (SLOs) for Vruttaant.

## Scope

Baseline scenarios cover:

1. Public cards read API (`GET /api/v1/news/cards`)
2. Translation API (`POST /api/v1/news/translate`)
3. Authenticated bookmarks read API (`GET /api/v1/user/bookmarks`) when a token is provided

## SLO Targets (Initial)

These are practical starting targets for local/staging validation and can be tightened after 2-3 baseline runs.

| Scenario | p95 latency target | Minimum throughput | Max error rate |
| --- | --- | --- | --- |
| Cards Read API | <= 350 ms | >= 2 req/s | <= 1% |
| Translate API | <= 1200 ms | >= 2 req/s | <= 1% |
| Bookmarks Auth Read API | <= 500 ms | >= 2 req/s | <= 1% |

## Run the Baseline

From `backend/`:

```bash
npm run loadtest:baseline
```

Strict mode (fails process on SLO misses):

```bash
npm run loadtest:baseline:strict
```

## Required Runtime Conditions

1. MongoDB is running (`npm run infra:up`)
2. Backend is running and `/ready` returns `200`

By default the script targets:

- `LOADTEST_BASE_URL=http://127.0.0.1:5001`
- `LOADTEST_DURATION_SECONDS=20`
- `LOADTEST_CONNECTIONS=4`
- `LOADTEST_OVERALL_RATE=3`

## Optional Authenticated Scenario

To include authenticated bookmark-read load test, provide:

```bash
export LOADTEST_ACCESS_TOKEN=<jwt_access_token>
npm run loadtest:baseline
```

If `LOADTEST_ACCESS_TOKEN` is missing, authenticated scenario is skipped intentionally.

## Tunable Environment Variables

- `LOADTEST_BASE_URL`
- `LOADTEST_DURATION_SECONDS`
- `LOADTEST_CONNECTIONS`
- `LOADTEST_OVERALL_RATE`
- `LOADTEST_STRICT_SLO` (`true` or `false`)
- `SLO_CARDS_READ_P95_MS`
- `SLO_TRANSLATE_P95_MS`
- `SLO_AUTH_READ_P95_MS`
- `SLO_MAX_ERROR_RATE_PERCENT`
- `SLO_CARDS_READ_MIN_RPS`
- `SLO_TRANSLATE_MIN_RPS`
- `SLO_AUTH_READ_MIN_RPS`

## Notes

1. These SLOs are baseline targets, not production contractual SLAs.
2. Run at least 3 times and use median results before tightening targets.
3. For CI, start with non-blocking reporting and move to strict mode once baseline is stable.

## Initial Baseline Snapshot (May 18, 2026)

Run profile: default settings, local machine, unauthenticated scenarios only.

1. Cards Read API: PASS
	- p95 latency: 0 ms
	- avg throughput: 3.00 req/s
	- error rate: 0.00%
2. Translate API: PASS
	- p95 latency: 0 ms
	- avg throughput: 3.00 req/s
	- error rate: 0.00%

Overall: 6/6 checks passed.
