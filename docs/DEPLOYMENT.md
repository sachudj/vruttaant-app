# Deployment Configuration and Release Runbook

## Purpose

This document defines environment configuration, deployment gates, and rollout/rollback steps for Vruttaant backend and mobile app releases.

## Environments

1. `development` - local developer setup
2. `staging` - pre-production verification environment
3. `production` - user-facing environment

## Backend Environment Profiles

Template files:

1. `backend/.env.example` (local)
2. `backend/.env.staging.example`
3. `backend/.env.production.example`

Required production/staging variables:

1. `NODE_ENV`
2. `MONGODB_URI`
3. `CORS_ALLOWED_ORIGINS`
4. `JWT_ACCESS_SECRET`
5. `JWT_REFRESH_SECRET`
6. `SENTRY_DSN` (recommended)
7. `APP_VERSION`

## Mobile Environment Profiles

Template files:

1. `mobile_app/env/staging.json`
2. `mobile_app/env/production.json`

Build using environment-specific defines:

```bash
cd mobile_app

# Staging
flutter run --dart-define-from-file=env/staging.json

# Production build
flutter build apk --release --dart-define-from-file=env/production.json
flutter build ios --release --dart-define-from-file=env/production.json
```

## CI Deployment Gate

Workflow: `.github/workflows/deploy-gate.yml`

Gate checks:

1. Backend smoke suite (`bash scripts/run-smoke-auto.sh`)
2. Strict backend load SLO baseline (`npm run loadtest:baseline:strict`)

Trigger modes:

1. Push to `main`
2. Manual run (`workflow_dispatch`)

## Rollout Playbook

### 1. Pre-Deploy Checklist

1. Merge to `main` only after CI + deploy gate passes
2. Confirm `docs/PROJECT_STATUS.md` is updated for user-facing changes
3. Confirm secrets are set in deployment platform (not in repo)
4. Validate staging backend health (`/ready`, `/health`, `/metrics`)
5. Verify smoke test output shows `FAIL=0`

### 2. Staging Rollout

1. Deploy backend with `backend/.env.staging.example` values (secret-managed)
2. Deploy staging mobile artifact with `mobile_app/env/staging.json`
3. Execute post-deploy checks:
   - `GET /ready` returns `200`
   - `GET /health` returns `status: ok`
   - Smoke script passes
   - Load baseline strict mode passes

### 3. Production Rollout

1. Deploy backend with production profile values
2. Deploy mobile release artifact with production defines
3. Verify:
   - Error rate alert channels are active
   - Dashboard shows request and latency metrics
   - No spike in `5xx` over first 15 minutes

## Rollback Playbook

### Backend Rollback

1. Redeploy last stable image/tag
2. Re-run `/ready` and `/health`
3. Re-run smoke suite
4. Keep traffic on rollback version until root cause is resolved

### Mobile Rollback

1. Revert API endpoint routing if backend incompatibility is detected
2. If required, pause staged rollout in app stores
3. Promote prior stable build if crash/error rate exceeds threshold

### Rollback Decision Triggers

1. `5xx` rate exceeds alert threshold for 10 minutes
2. Smoke checks fail in production
3. Deploy gate SLO checks fail after release cut
4. Authentication or bookmark core flows are degraded

## Post-Deploy Verification

1. Run `bash scripts/run-smoke-auto.sh`
2. Record release tag, timestamp, and checks result
3. Log incidents or mitigations in release notes
