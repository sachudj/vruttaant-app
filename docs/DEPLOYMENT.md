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
8. `IMAGE_CDN_BASE_URL` or `IMAGE_CDN_URL_TEMPLATE` (recommended for optimized artwork delivery)
9. `IMAGE_CDN_DEFAULT_WIDTH` (recommended, for example `1200`)
10. `IMAGE_CDN_DEFAULT_QUALITY` (recommended, for example `80`)

Backup automation variables (for scripts):

1. `BACKUP_DIR` (default: `../backups/mongodb`)
2. `BACKUP_RETENTION_COUNT` (default: `14`)
3. `DB_NAME` (default: `vruttaant`)
4. `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_AUTH_DB`
5. Optional: `VERIFY_DB`, `VERIFY_BACKUP_DIR` for restore drills

Reference template: `backend/.env.backup.example`

Image delivery notes:

1. Use `IMAGE_CDN_BASE_URL` when your CDN exposes a fetch endpoint that accepts a source `url` query parameter.
2. Use `IMAGE_CDN_URL_TEMPLATE` when your provider needs a path or signed-template format, with `{url}`, `{width}`, and `{quality}` placeholders.
3. If neither variable is set, the backend serves original source image URLs without CDN rewriting.

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
   - `GET /api/v1/admin/release-telemetry` returns healthy release snapshot for version/env/traffic
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

## Backup and Restore Operations

### RPO/RTO Targets

1. Recovery Point Objective (RPO): 24 hours
2. Recovery Time Objective (RTO): 60 minutes

### Backup Schedule

1. Run daily backup in staging and production via scheduler:

```bash
cd backend
npm run infra:backup
```

2. Suggested schedule example (UTC 02:15 daily):

```bash
15 2 * * * cd /path/to/vruttaant-app/backend && npm run infra:backup >> /var/log/vruttaant-backup.log 2>&1
```

### Restore Commands

1. Validate latest snapshot without applying changes:

```bash
cd backend
npm run infra:restore -- --latest --dry-run
```

2. Restore latest snapshot into target DB:

```bash
cd backend
npm run infra:restore -- --latest --drop
```

3. Restore explicit snapshot:

```bash
cd backend
npm run infra:restore -- --backup-file ../backups/mongodb/vruttaant_YYYYMMDD_HHMMSS.archive.gz --drop
```

### Weekly Restore Drill

Run deterministic backup/restore verification over isolated DB:

```bash
cd backend
npm run infra:backup:verify
```

Expected result:

1. Verification dataset restored with marker/count parity
2. Script exits with status code `0`

## Post-Deploy Verification

1. Run `bash scripts/run-smoke-auto.sh`
2. Record release tag, timestamp, and checks result
3. Log incidents or mitigations in release notes
