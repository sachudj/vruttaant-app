# API Versioning Strategy

**Date**: May 7, 2026  
**Current Version**: 1.0.0

## Overview

The Vruttaant backend uses URL-based versioning to manage API evolution. All endpoints are prefixed with `/api/v{N}` where `N` is the major version number.

## Current Endpoints

### v1 (Current, Active)
- Base URL: `https://api.vruttaant.app/api/v1`
- Endpoints:
  - `POST /api/v1/news/ingest` - Ingest news from a source URL
  - `GET /api/v1/news/cards` - Retrieve paginated news cards

### v0 (Deprecated, Backwards Compatibility)
- Base URL: `https://api.vruttaant.app/api/news` (legacy)
- Status: **Deprecated** as of May 7, 2026
- Timeline: Will be removed in v2.0.0 (estimated Q3 2026)
- Warning: Deprecation warning logged for all non-versioned requests

## Version Stability Guarantee

### v1.x.x Compatibility
Within the v1 major version, we guarantee:
- ✅ Response shape stability (no fields removed)
- ✅ Request parameter compatibility (new params added with defaults)
- ✅ HTTP status code consistency
- ✅ Error response envelope format (see `middleware/errorHandler.js`)

Breaking changes (if necessary) will trigger a v2.0.0 release.

### Supported v1 Releases
| Release | Status | Supported Until |
|---------|--------|-----------------|
| v1.0.0+ | Active | Q3 2026 (estimated) |

## Migration Guide: v0 to v1

### Before (v0, Deprecated)
```bash
curl -X POST http://localhost:5000/api/news/ingest \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "language": "en"}'
```

### After (v1, Current)
```bash
curl -X POST http://localhost:5000/api/v1/news/ingest \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "language": "en"}'
```

### Changes
- **URL Change**: `/api/news/...` → `/api/v1/news/...`
- **Response Format**: Identical (no changes to payload)
- **Error Handling**: All errors use centralized `AppError` envelope

## Future Versioning Plans

### v2.0.0 (Planned Q3 2026)
Expected changes:
- User authentication & authorization endpoints
- Bookmark management scoped to user
- New fields in news card response (user-specific metadata)
- Role-based access control

### Deprecation Timeline
- **v1 End of Life**: Q3 2026
- **v0 Removed**: v2.0.0 release

## Implementation Details

### Route Structure
- **File**: `backend/src/routes/apiRouter.js`
- **Pattern**: Express router middleware that mounts versioned routes
- **Backwards Compatibility**: Non-versioned paths log deprecation warnings and delegate to v1 handlers

### Adding a New Endpoint in v1
1. Add route in `backend/src/routes/newsRoutes.js`
2. No additional versioning code required (inherits v1 context)
3. Automatically available at `/api/v1/news/<route>`

### Breaking Changes & v2 Migration Path
1. Create new routes in `backend/src/routes/apiV2Router.js`
2. Mount at `/api` alongside `apiRouter.js`
3. Support both v1 and v2 during transition period
4. Announce v1 deprecation 3 months before removal

## Testing

All version-specific tests should:
- Test against `/api/v1/...` endpoints (primary)
- Optionally test against `/api/...` for backwards compatibility (until v2)

Example:
```javascript
describe('POST /api/v1/news/ingest', () => {
  test('should ingest news', () => {
    // test code
  });
});
```

## Questions?

For versioning strategy discussions or migration support, refer to the main [ROADMAP.md](../ROADMAP.md).
