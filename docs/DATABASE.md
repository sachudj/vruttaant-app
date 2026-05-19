# Database Schema & Data Models

## Collections

### newsCards

**Purpose**: Store ingested news articles from various sources.

**Schema**:

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  title: String,                    // Article headline (required)
  summary: String,                  // Short excerpt or description
  aiSummary: String,                // LLM-generated neutral 60-word summary
  url: String,                      // Source article URL (required)
  imageUrl: String,                 // Featured image URL
  source: String,                   // Publication name (e.g., "BBC", "The Guardian")
  language: String,                 // ISO 639-1 code (e.g., "en", "es", "hi")
  publishedAt: Date,                // When article was published (if available)
  scrapedAt: Date,                  // When we extracted this article
  rawMetadata: Mixed,               // Extra fields from scraper
  createdAt: Date,                  // MongoDB auto-timestamp
  updatedAt: Date                   // MongoDB auto-timestamp
}
```

**Indexes**:
- **Unique**: `(url, language)` - Prevent duplicate articles per language
- **Feed Reads**: `(language, scrapedAt desc)`, `(language, category, scrapedAt desc)`
- **Trending Reads**: `(language, trendScore desc, scrapedAt desc)`
- **Search**: text index on `title`, `summary`, `aiSummary`, `source`
- **Deduplication**: `(titleFingerprint, language)`
- **Implicit**: `_id` (primary key)

**Example Document**:
```json
{
  "_id": ObjectId("66373fa1c8e4d7e5b2a1c9d2"),
  "title": "Climate change accelerates Arctic warming",
  "summary": "New research shows Arctic warming at 4x global average rate",
  "aiSummary": "Researchers report Arctic temperatures rising much faster than the global average, with impacts on sea ice, ecosystems, and coastal communities. The study links warming trends to greenhouse gas emissions and warns of wider climate effects. Scientists recommend sustained mitigation and adaptation planning while emphasizing continued monitoring to guide policy and reduce long-term environmental and economic risks.",
  "url": "https://bbc.com/news/arctic-warming-2026",
  "imageUrl": "https://static.files.bbci.co.uk/image.jpg",
  "source": "BBC News",
  "language": "en",
  "publishedAt": ISODate("2026-05-05T08:30:00Z"),
  "scrapedAt": ISODate("2026-05-05T10:15:23Z"),
  "rawMetadata": {
    "selectorMatched": true,
    "extractedFrom": "article"
  },
  "createdAt": ISODate("2026-05-05T10:15:23Z"),
  "updatedAt": ISODate("2026-05-05T10:15:23Z")
}
```

---

## Query Examples

### Find All English Articles
```javascript
db.newscards.find({ language: "en" })
```

### Find Articles from Specific Source
```javascript
db.newscards.find({ source: "BBC News" })
```

### Find by Language and Publish Date Range
```javascript
db.newscards.find({
  language: "es",
  publishedAt: {
    $gte: ISODate("2026-05-01T00:00:00Z"),
    $lte: ISODate("2026-05-05T23:59:59Z")
  }
})
```

### Find Most Recently Scraped Articles
```javascript
db.newscards
  .find({ language: "en" })
  .sort({ scrapedAt: -1 })
  .limit(20)
```

### Check for Duplicates
```javascript
db.newscards.aggregate([
  { $group: { _id: { url: "$url", language: "$language" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

### Find Articles Without Images
```javascript
db.newscards.find({ imageUrl: { $in: ["", null] } })
```

---

## Aggregation Examples

### Count Articles by Language
```javascript
db.newscards.aggregate([
  { $group: { _id: "$language", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Count Articles by Source
```javascript
db.newscards.aggregate([
  { $group: { _id: "$source", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Articles Scraped Today (English)
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);

db.newscards.find({
  language: "en",
  scrapedAt: { $gte: today }
})
```

---

## Future Collections

### users (Planned)

```javascript
{
  _id: ObjectId,
  email: String,                    // Login identifier
  passwordHash: String,             // Bcrypt hashed password
  username: String,                 // Display name
  languages: [String],              // Preferred languages
  sourcePreferences: [String],      // Preferred news sources
  createdAt: Date,
  updatedAt: Date
}
```

### saved_cards (Planned)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                 // Reference to users._id
  newsCardId: ObjectId,             // Reference to newscards._id
  savedAt: Date,
  notes: String                     // User's personal notes
}
```

### preferences (Planned)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  theme: String,                    // "light", "dark"
  language: String,                 // App UI language
  notificationsEnabled: Boolean,
  refreshIntervalMinutes: Number
}
```

---

## Maintenance

### Backup
```bash
# Full database export
mongodump --username admin --password admin123 \
  --authenticationDatabase admin \
  --db vruttaant \
  --out /path/to/backup
```

### Restore
```bash
mongorestore --username admin --password admin123 \
  --authenticationDatabase admin \
  /path/to/backup
```

### Remove Old Articles (Cleanup)
```javascript
// Remove articles older than 30 days
db.newscards.deleteMany({
  scrapedAt: {
    $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }
})
```

### Rebuild Indexes
```javascript
db.newscards.reIndex()
```

---

## Validation Rules

- **title**: Required, max 500 characters
- **url**: Required, must be valid URL, unique per language
- **language**: 2-character ISO code (en, es, hi, etc.)
- **publishedAt**: Optional, must be before current date if provided
- **summary**: Max 1000 characters

---

## Performance Notes

- Index on `(url, language)` ensures upsert operations are fast
- Feed pagination uses compound indexes for latest and category-filtered article reads
- Recommendation candidate selection uses `(language, trendScore desc, scrapedAt desc)` to bound scoring work
- Activity history and analytics paths use compound `userId` / `eventType` / `eventAt` indexes to avoid full event scans
- Badge evaluation now uses one aggregation over indexed activity events instead of loading all user events into application memory
- Cohort listing uses `(cohortId, assignedAt desc)` and `(userId, cohortType, cohortId)` indexes for admin/user cohort reads
- Notification-device cohort assignment uses `(userId, enabled, platform)` to limit device lookups to active registrations
- Consider archiving articles older than 90 days to keep collection lean
- Monitor collection size with: `db.newscards.stats()`

### Execution Plan Checks

Use `explain('executionStats')` in `mongosh` after deploying index changes. For read-heavy paths, prefer `IXSCAN` over `COLLSCAN` and confirm examined documents stay close to returned documents.

```javascript
// Feed: latest cards by language/category
db.newscards.find({ language: 'en', category: 'Business' })
  .sort({ scrapedAt: -1 })
  .limit(20)
  .explain('executionStats')

// Recommendations: candidate fetch before in-memory scoring
db.newscards.find({ language: 'en', scrapedAt: { $gte: ISODate('2026-05-12T00:00:00Z') } })
  .sort({ trendScore: -1, scrapedAt: -1 })
  .limit(200)
  .explain('executionStats')

// User activity history / badge metrics
db.user_activity_events.find({ userId: ObjectId('000000000000000000000001') })
  .sort({ eventAt: -1 })
  .limit(20)
  .explain('executionStats')

// Cohort admin list
db.usercohorts.find({ cohortId: 'language_en' })
  .sort({ assignedAt: -1 })
  .limit(20)
  .explain('executionStats')
```

If `winningPlan.stage` shows `COLLSCAN` for these shapes, re-check the deployed indexes and query predicate order before widening hardware or cache budgets.

---

## Access Control

All database operations use authenticated admin user:
- Username: `admin`
- Password: `admin123`
- Auth DB: `admin`

Future: Implement role-based access control (RBAC).
