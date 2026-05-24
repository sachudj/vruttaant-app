# API Endpoints Reference

## Base URL

Primary API base:

```text
http://localhost:5000/api/v1
```

The backend auto-falls back to the next free port if `5000` is occupied.

## Versioning

Current stable namespace is `v1`.

Legacy non-versioned paths (`/api/news/*`, `/api/auth/*`) still exist for backward compatibility and emit deprecation warnings.

## Swagger / OpenAPI

1. Swagger UI: `/api/docs`
2. OpenAPI JSON: `/api/docs.json`
3. These routes are public in local/dev and reflect the documented v1 API surface.

## Postman Collection

`docs/Vruttaant.postman_collection.json` — import into Postman via **File → Import**.

Setup after import:
1. Set the `baseUrl` collection variable to `http://localhost:5001` (or `5000` if free).
2. Run **Auth / Login** (or **Signup**). The built-in test script auto-saves `accessToken` and `refreshToken` to the collection variables.
3. All authenticated requests use `{{accessToken}}` automatically via collection-level Bearer auth.

## Auth Model

1. Public: no token required
2. Optional auth: token improves personalization, anonymous calls still allowed
3. Authenticated user: requires `Authorization: Bearer <accessToken>`
4. Admin: authenticated user with `role=admin`

## Platform Endpoints

### Health and Platform

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Service health (`databaseConnected`, `cacheConnected`) |
| GET | `/ready` | Public | Readiness probe |
| GET | `/metrics` | Public | Prometheus metrics |
| GET | `/` | Public | Root service metadata |

### News

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/news/ingest/health` | Public | Route health |
| POST | `/api/v1/news/ingest` | Public | Scrape and optionally persist articles |
| GET | `/api/v1/news/cards` | Optional auth | Feed cards with pagination/filter/sort |
| GET | `/api/v1/news/recommended` | Optional auth | Recommendation feed |
| POST | `/api/v1/news/translate` | Public | Translate a story payload |

### Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/signup` | Public | Create account |
| POST | `/api/v1/auth/login` | Public | Login and issue access/refresh tokens |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token and issue new access token |
| POST | `/api/v1/auth/logout` | Public | Revoke refresh token |
| POST | `/api/v1/auth/social` | Public | Social sign-in (Google/Apple) and issue access/refresh tokens |

`POST /api/v1/auth/social` request body:

```json
{
	"provider": "google",
	"idToken": "<provider-id-token>",
	"nonce": "<required-for-apple>"
}
```

Notes:
- `provider` must be `google` or `apple`.
- `nonce` is required for Apple token verification.
- Response shape matches login/signup token response (`data.user`, `data.tokens`).
- Email-linking policy is explicit. If an account already exists for the same email and
	`SOCIAL_AUTH_AUTO_LINK_BY_EMAIL` is disabled (default), the endpoint returns `409`.
- First-time social sign-in and email-based linking require a verified provider email.
- Apple nonce values are enforced as single-use server-side to prevent replay.

Common `/auth/social` failure responses:

```json
{
	"success": false,
	"error": {
		"statusCode": 401,
		"message": "Invalid Google id token.",
		"requestId": "..."
	}
}
```

```json
{
	"success": false,
	"error": {
		"statusCode": 409,
		"message": "A user with this email already exists. Sign in with the existing method and link social auth explicitly.",
		"requestId": "..."
	}
}
```

### User

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/user/profile` | User | Get profile + preferences |
| PATCH | `/api/v1/user/profile` | User | Update language/categories preferences |
| GET | `/api/v1/user/notifications/preferences` | User | Get notification preferences |
| PATCH | `/api/v1/user/notifications/preferences` | User | Update notification preferences |
| POST | `/api/v1/user/notifications/devices` | User | Register push device |
| GET | `/api/v1/user/notifications/devices` | User | List registered devices |
| DELETE | `/api/v1/user/notifications/devices/:deviceId` | User | Delete registered device |
| GET | `/api/v1/user/activity/history` | User | Paginated user activity history |
| GET | `/api/v1/user/activity/reading-feed` | User | Recent reading-feed events |
| GET | `/api/v1/user/activity/stats` | User | User engagement stats |
| GET | `/api/v1/user/badges` | User | Earned badges |
| GET | `/api/v1/user/badges/progress` | User | Progress toward unearned badges |
| POST | `/api/v1/user/badges/evaluate` | User | Trigger badge evaluation |
| POST | `/api/v1/user/badges/:badgeId/view` | User | Mark badge viewed |
| GET | `/api/v1/user/badges/metrics` | User | Engagement metrics for badge logic |
| GET | `/api/v1/user/cohorts` | User | User cohort memberships |
| POST | `/api/v1/user/cohorts/refresh` | User | Recompute user cohorts |

### Bookmarks

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/user/bookmarks` | User | Create bookmark |
| GET | `/api/v1/user/bookmarks` | User | List bookmarks |
| DELETE | `/api/v1/user/bookmarks/:id` | User | Delete bookmark |

### Analytics

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/analytics/events` | Optional auth | Capture activity event |
| GET | `/api/v1/analytics/trending` | Admin | Trending analytics by card |
| GET | `/api/v1/analytics/categories` | Admin | Category analytics |
| GET | `/api/v1/analytics/card/:cardId/metrics` | Admin | Single card analytics |
| GET | `/api/v1/analytics/user/engagement` | User | Logged-in user engagement summary |

### Admin

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/health` | Admin | Detailed system health |
| GET | `/api/v1/admin/stats` | Admin | System statistics |
| GET | `/api/v1/admin/release-telemetry` | Admin | Release health snapshot |
| POST | `/api/v1/admin/loadtest/runs` | Admin | Ingest load-test run report |
| GET | `/api/v1/admin/loadtest/history` | Admin | Load-test run history |
| GET | `/api/v1/admin/loadtest/trends` | Admin | Aggregated load-test trends |
| POST | `/api/v1/admin/notifications/send` | Admin | Broadcast admin push notification |
| GET | `/api/v1/admin/cohorts/stats` | Admin | Cohort aggregate stats |
| GET | `/api/v1/admin/cohorts/:cohortId/users` | Admin | Paginated users in cohort |
| GET | `/api/v1/admin/sources` | Admin | List source registry entries (`language`, `includeDisabled`, `includeSuspended` filters) |
| PATCH | `/api/v1/admin/sources/:sourceId` | Admin | Update one source (enable/disable, priority, reliability, suspension) |
| PATCH | `/api/v1/admin/sources/language/:language` | Admin | Bulk update all sources for a language |

### Public Badge Catalog

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/badges/catalog` | Public | Badge definitions catalog |

## Key Query and Payload Constraints

### `/api/v1/news/cards`

1. `language`: normalized aliases, defaults to `en`
2. `page`: min `1`
3. `limit`: `1..100`
4. `sort`: `latest` or `relevance` or `trending`
5. Optional: `category`, `q`

### `/api/v1/news/recommended`

1. `language`: normalized aliases, defaults to `en`
2. `page`: min `1`
3. `limit`: `1..100`
4. Optional: `recentlyShown` format `category:count,category2:count2`

### `/api/v1/news/translate`

1. Requires at least one of: `title`, `summary`
2. Requires `targetLanguage`
3. Optional `url` must be absolute HTTP(S) if provided

### `/api/v1/analytics/events`

1. `eventType`: `view`, `bookmark`, `translate`, `share`
2. `newsCardId`: valid Mongo ObjectId
3. `duration` bounds are enforced for `view`
4. `translation.fromLanguage` and `translation.toLanguage` required for `translate`

## Common Status Codes

1. `200` request succeeded
2. `201` resource/event created
3. `400` validation failure
4. `401` missing/invalid auth
5. `403` role not allowed
6. `404` resource not found
7. `429` rate limit exceeded
8. `500` unexpected internal error
9. `503` dependency not ready (for example DB disconnected)

## Notes

1. Rate limiting is active on `/api/*` paths.
2. CORS allowlist is environment-configured.
3. Error payloads include standardized envelope fields in production mode.
4. For complete release and load-test operational flows, see [DEPLOYMENT.md](./DEPLOYMENT.md) and [LOAD_TESTING.md](./LOAD_TESTING.md).
