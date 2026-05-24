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

## Free Test Hosting Recommendation

For low-cost or free internet-accessible testing, the recommended stack for this repository is:

1. Backend app host: Render Web Service
2. Database: MongoDB Atlas free cluster
3. Cache: Upstash Redis free tier (recommended, but optional for first test deploy)

Why this combination:

1. Render is the simplest path for deploying the existing Node/Express backend from GitHub.
2. MongoDB Atlas is the most straightforward free hosted Mongo option for Mongoose apps.
3. The backend already degrades gracefully if `REDIS_URL` is missing, so Redis can be added after first successful internet deployment.

### Quick Decision

Use this setup when:

1. You want a public backend URL quickly for Android/iPhone testing.
2. You do not want to keep your laptop running behind a tunnel.
3. You want a deployment path that can later be upgraded to a paid production plan.

### Render Service Setup

Create a new Render Web Service pointing at this repository with:

1. Root directory: `backend`
2. Build command: `npm install`
3. Start command: `npm start`
4. Health check path: `/health`
5. Auto deploy: enabled for testing, optional later for production discipline

Expected public URL example:

```text
https://vruttaant-backend-test.onrender.com
```

### MongoDB Atlas Setup

Create a free shared cluster and obtain a connection string like:

```text
mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority
```

For quick testing:

1. Create DB user with read/write access to the app database.
2. Add a network access rule that allows your host platform to connect.
3. If you want the fastest path and accept temporary looseness, allow `0.0.0.0/0` during testing and tighten later.

### Upstash Redis Setup

Create a free Redis database and copy its `REDIS_URL`.

Notes:

1. Redis is recommended for feed/cache parity.
2. If you skip `REDIS_URL`, the backend still boots and serves requests; caching is just disabled.

### Minimum Environment Variables For First Public Test

These are the minimum vars to set in Render for a functional backend deployment:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=<Atlas connection string>
JWT_ACCESS_SECRET=<long random secret>
JWT_REFRESH_SECRET=<long random secret>
APP_VERSION=render-test
```

Recommended additions:

```bash
REDIS_URL=<Upstash redis url>
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
JSON_PAYLOAD_LIMIT=10kb
RESPONSE_COMPRESSION_THRESHOLD_BYTES=1536
CACHE_TTL_NEWS_CARDS=180
CACHE_TTL_RECOMMENDED=90
CACHE_TTL_ANALYTICS=300
```

Optional image optimization/CDN vars:

```bash
IMAGE_CDN_BASE_URL=
IMAGE_CDN_URL_TEMPLATE=
IMAGE_CDN_DEFAULT_WIDTH=1200
IMAGE_CDN_DEFAULT_QUALITY=80
```

### CORS Guidance For Mobile Testing

If you are only testing the Android/iOS app, `CORS_ALLOWED_ORIGINS` is not required for the native app path because those requests typically do not send a browser origin.

Set `CORS_ALLOWED_ORIGINS` only if you also need:

1. Browser-based testing
2. A deployed web client
3. Swagger/docs or frontends from specific origins

Example:

```bash
CORS_ALLOWED_ORIGINS=https://your-web-app.example.com,http://localhost:3000
```

### First Deploy Validation

After Render marks the service healthy, verify these URLs:

```bash
curl https://your-render-url.onrender.com/health
curl https://your-render-url.onrender.com/ready
curl https://your-render-url.onrender.com/api/docs.json
```

Expected first-pass success criteria:

1. `/health` returns `status: ok`
2. `/ready` returns HTTP `200`
3. `/api/docs.json` returns the OpenAPI document

### Build Mobile App Against Hosted Backend

Once the backend URL is live, build the APK against it:

```bash
cd /path/to/vruttaant-app
MOBILE_API_BASE_URL=https://your-render-url.onrender.com npm run mobile:publish-apk
```

Then commit/push the refreshed APK artifact if you want the latest installable APK kept in the repository.

### Lowest-Friction First Deployment Plan

1. Deploy backend on Render
2. Connect MongoDB Atlas
3. Omit Redis on first attempt if you want the smallest moving surface
4. Validate `/health`
5. Build Android APK using `MOBILE_API_BASE_URL=https://your-render-url.onrender.com`
6. Install APK on phone and test feed loading

### Known Free-Tier Tradeoffs

1. Cold starts may delay the first request.
2. Free plans may sleep after inactivity.
3. Throughput and background-job reliability are not production-grade.
4. Hostnames and quotas can change over time depending on provider policy.

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
