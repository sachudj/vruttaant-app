# Development Workflow

## Quick Reference

### Initialize Everything
```bash
# 1. Start MongoDB
cd backend && npm run infra:up

# 2. Setup backend (from backend directory)
cp .env.example .env
npm install
npm start

# 3. Setup mobile app (in separate terminal, from project root)
cd mobile_app
flutter pub get
flutter run
```

## Daily Development Routine

### Start of Day
```bash
# Verify MongoDB is running
cd backend && npm run infra:ps

# If not, start it
npm run infra:up

# Start backend server
npm start
# Output: Server running on http://localhost:5001
```

### Backend Development

```bash
cd backend

# Development mode (auto-restart on file changes)
npm run dev

# Or standard mode
npm start
```

**File Structure**:
- `src/index.js` - App initialization
- `src/routes/newsRoutes.js` - Route definitions
- `src/controllers/newsController.js` - Endpoint handlers
- `src/services/newsIngestionService.js` - Business logic
- `src/models/NewsCard.js` - Data schema
- `src/config/database.js` - DB connection

**Testing Endpoints**:
```bash
# Health check
curl http://localhost:5001/health

# Ingest from BBC
curl -X POST http://localhost:5001/api/news/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://bbc.com/news","persist":true}'
```

### Mobile Development

```bash
cd mobile_app

# Install dependencies
flutter pub get

# Run on device/simulator
flutter run

# Or specify device
flutter run -d "iPhone 15 Pro"

# Hot reload (during development, press 'r' in terminal)
```

**File Structure** (will create as needed):
- `lib/main.dart` - Entry point
- `lib/screens/` - Full pages
- `lib/widgets/` - Reusable components
- `lib/services/api_service.dart` - Backend API calls
- `lib/models/` - Data classes

### Database Operations

```bash
# Access MongoDB shell
mongosh "mongodb://admin:admin123@127.0.0.1:27017/vruttaant?authSource=admin"

# In mongo shell
use vruttaant
db.newscards.find()
db.newscards.countDocuments()
db.newscards.deleteMany({})  # Clear all articles
```

**Via Mongo Express UI**:
```
http://localhost:8081
```

## Git Workflow

### Before Committing
1. Update `.env.example` if secrets changed
2. Verify `.gitignore` excludes `.env`, `node_modules/`, build files
3. Run tests (when available)

### Typical Commit Flow
```bash
git status
git add <files>
git commit -m "feat: add news endpoint" 
git push
```

### Branch Strategy
```bash
# Feature branch
git checkout -b feat/news-ingestion

# Make changes, commit, then
git push -u origin feat/news-ingestion

# Create PR on GitHub, then merge after review
git checkout main
git pull
git branch -d feat/news-ingestion
```

## Code Quality

### Linting (Backend)
```bash
# Install ESLint (future)
npm install --save-dev eslint

# Run linter
npm run lint
```

### Formatting (Code Style)
```bash
# Install Prettier (future)
npm install --save-dev prettier

# Format files
npm run format
```

### Testing

**Backend Unit Tests** (future):
```bash
npm test
```

**Mobile Widget Tests**:
```bash
flutter test
```

## Debugging Techniques

### Backend Debugging

**Add console logs**:
```javascript
// src/controllers/newsController.js
console.log('Ingesting from URL:', url);
console.log('Parsed cards:', parsedCards.cards.length);
```

**View server logs**:
```bash
npm start
# All output appears in terminal
```

**Inspect MongoDB**:
```bash
# Check data was saved
mongosh "mongodb://admin:admin123@127.0.0.1:27017/vruttaant?authSource=admin"
db.newscards.findOne()
```

### Mobile Debugging

**Dart DevTools**:
```bash
flutter pub global activate devtools
devtools
```

**Console logs**:
```dart
print('Debug message');
debugPrint('Another debug message');
```

**Device Logs**:
```bash
flutter logs
```

**Hot Reload Issues**:
```bash
# If hot reload fails, hot restart
# (Press Shift+R in terminal while app running)
# Or manually stop and restart
flutter clean
flutter pub get
flutter run
```

## Common Development Tasks

### Add New API Endpoint

1. Create controller method in `src/controllers/newsController.js`:
```javascript
async function getCardsByLanguage(req, res) {
  const { language } = req.params;
  // Implementation
}
```

2. Add route in `src/routes/newsRoutes.js`:
```javascript
router.get('/cards/:language', getCardsByLanguage);
```

3. Export from controller:
```javascript
module.exports = {
  ingestNewsFromUrl,
  getCardsByLanguage
};
```

4. Test with curl:
```bash
curl http://localhost:5001/api/news/cards/en
```

### Add Environment Variable

1. Update `backend/.env.example`:
```env
NEW_VAR=value
```

2. Copy to `.env`:
```bash
cp .env.example .env
```

3. Use in code:
```javascript
const myVar = process.env.NEW_VAR;
```

### Update Dependencies

**Backend**:
```bash
cd backend
npm install package-name@latest
npm install --save-dev dev-package@latest
```

**Mobile**:
```bash
cd mobile_app
flutter pub add package_name
flutter pub upgrade
```

## Performance Monitoring

### Backend Response Times
Add timing logs:
```javascript
const start = Date.now();
// ... do work ...
console.log(`Operation took ${Date.now() - start}ms`);
```

### Database Query Performance
```bash
mongosh
db.newscards.find().explain("executionStats")
```

### Mobile FPS
Use Flutter DevTools Performance tab (see above).

## End of Day Checklist

- [ ] All code changes committed and pushed
- [ ] Verified backend health: `curl http://localhost:5001/health`
- [ ] Checked MongoDB has data: `db.newscards.countDocuments()`
- [ ] Mobile app builds without errors: `flutter test`
- [ ] `.env` is git-ignored and not committed
- [ ] No console errors/warnings

## Stopping Everything

```bash
# Stop backend (Ctrl+C in terminal running npm start)

# Stop mobile app (Ctrl+C in flutter run terminal)

# Stop MongoDB
cd backend && npm run infra:down
```

## Resources

- [Express.js Docs](https://expressjs.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [Flutter Docs](https://flutter.dev/docs)
- [Cheerio Docs](https://cheerio.js.org/)

## Next Steps

- Read [BACKEND.md](./BACKEND.md) for detailed API info
- Check [MOBILE_APP.md](./MOBILE_APP.md) for Flutter guide
- Review [DATABASE.md](./DATABASE.md) for MongoDB schemas
