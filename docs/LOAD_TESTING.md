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
- `LOADTEST_ENVIRONMENT` (`local`, `staging`, `production`; default `local`)
- `LOADTEST_SOURCE` (for example `ci`, `manual`, `scheduled`)
- `LOADTEST_REPORT_DIR` (default `backend/loadtest-results`)
- `LOADTEST_REPORT_ENDPOINT` (admin ingestion endpoint, optional)
- `LOADTEST_REPORT_TOKEN` (admin JWT for report ingestion, optional)

## Multi-Environment History (M3)

Baseline runs now persist to JSON reports on disk per environment and can be pushed to backend storage for trend analysis.

1. Local file report path (default):
	- `backend/loadtest-results/<environment>/baseline_<timestamp>.json`
2. Optional backend ingestion endpoint:
	- `POST /api/v1/admin/loadtest/runs`
3. Admin trend endpoints:
	- `GET /api/v1/admin/loadtest/history?environment=staging&rangeDays=30&limit=20`
	- `GET /api/v1/admin/loadtest/trends?environment=staging&rangeDays=30`

Example (staging run + publish):

```bash
export LOADTEST_ENVIRONMENT=staging
export LOADTEST_SOURCE=ci
export LOADTEST_REPORT_ENDPOINT="http://127.0.0.1:5001/api/v1/admin/loadtest/runs"
export LOADTEST_REPORT_TOKEN="<admin_jwt>"

cd backend
npm run loadtest:baseline:strict
```

## Trend Reporting (Staging vs Production)

Use the admin trend endpoints to compare rollout performance across environments.

### 1) Pull trend snapshots

```bash
# Staging trend summary (last 30 days)
curl -sS "http://127.0.0.1:5001/api/v1/admin/loadtest/trends?environment=staging&rangeDays=30" \
	-H "Authorization: Bearer <admin_jwt>"

# Production trend summary (last 30 days)
curl -sS "http://127.0.0.1:5001/api/v1/admin/loadtest/trends?environment=production&rangeDays=30" \
	-H "Authorization: Bearer <admin_jwt>"
```

### 2) Pull run-level history for drill-down

```bash
curl -sS "http://127.0.0.1:5001/api/v1/admin/loadtest/history?environment=staging&rangeDays=30&limit=20" \
	-H "Authorization: Bearer <admin_jwt>"
```

### 3) Recommended comparison table format

| Environment | Runs (30d) | Pass Rate | Cards p95 Avg | Translate p95 Avg | Cards RPS Avg | Translate RPS Avg | Error Rate Avg |
| --- | --- | --- | --- | --- | --- | --- | --- |
| staging | 12 | 91.67% | 145 ms | 420 ms | 3.40 | 2.95 | 0.22% |
| production | 18 | 94.44% | 132 ms | 390 ms | 3.65 | 3.10 | 0.15% |

### 4) Trend chart suggestions

1. Line chart: `cards_read.avgLatencyP95Ms` by `capturedAt` per environment
2. Line chart: `translate.avgLatencyP95Ms` by `capturedAt` per environment
3. Bar chart: `passRatePercent` by week and environment
4. Stacked area: failure count by scenario key over time

Use these views to catch regressions after releases and to tune SLO thresholds with observed trend data.

## Auto-Generated Markdown Summary

The deploy gate now generates a markdown summary from stored JSON run reports:

```bash
node scripts/summarize-loadtest-results.js \
	--input backend/loadtest-results \
	--output backend/loadtest-results/summary.md \
	--max-runs 30
```

The generated file (`backend/loadtest-results/summary.md`) is uploaded with CI artifacts and includes:

1. Environment overview (run count, pass count, pass rate, latest run)
2. Scenario averages (p95 latency, throughput, error rate)

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
