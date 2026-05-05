# Vruttaant Mobile App

Flutter client for Vruttaant with an InShorts-style vertical swipe feed.

## Implemented

- Full-screen `NewsCard` with image background and text overlay
- Vertical `PageView` feed
- Backend integration via `POST /api/news/ingest`
- Pull-to-refresh
- Pull-up pagination (append batches)
- Image prefetching for upcoming cards

## Key Paths

- `lib/main.dart` - app shell, feed state, refresh + pagination flow
- `lib/widgets/news_card.dart` - full-screen card widget
- `lib/services/news_api_service.dart` - backend API client
- `lib/models/news_item.dart` - mobile feed model
- `test/widget_test.dart` - widget tests for swipe and pagination

## Run

```bash
cd mobile_app
flutter pub get

# iOS simulator/device
flutter run --dart-define=API_BASE_URL=http://localhost:5000

# Android emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000
```

## Verify

```bash
flutter analyze
flutter test -r compact
```

For broader project docs, see `../docs/MOBILE_APP.md` and `../docs/INDEX.md`.
