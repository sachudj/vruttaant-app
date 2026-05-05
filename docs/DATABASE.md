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
- No index on `source` or `language` alone (consider adding if filtering heavily)
- Consider archiving articles older than 90 days to keep collection lean
- Monitor collection size with: `db.newscards.stats()`

---

## Access Control

All database operations use authenticated admin user:
- Username: `admin`
- Password: `admin123`
- Auth DB: `admin`

Future: Implement role-based access control (RBAC).
