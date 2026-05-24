# Flutter Mobile App Setup

## Overview
Flutter mobile app for browsing news in an InShorts-style vertical swipe interface. Supports iOS, Android, and Web with backend-powered feed loading.

## Prerequisites
- Flutter 3.41.9+ (installed via Homebrew)
- Dart 3.11.5+ (included with Flutter)
- iOS: Xcode 26.4.1+, CocoaPods 1.16.2+
- Android: Android Studio 2025.3+, Android SDK 36+, Java 26+

## Supported Platforms

- Android: API 24+ (Android 7.0+)
- iOS: 15.0+

Notes:
- Android minimum is inherited from `flutter.minSdkVersion` in `android/app/build.gradle.kts` (Flutter currently resolves this project to API 24).
- iOS minimum is pinned in both `ios/Podfile` and `ios/Runner.xcodeproj/project.pbxproj`.

## Verify Installation

```bash
flutter doctor
```

All checks should show `✓`:
```
[✓] Flutter (Channel stable, 3.41.9)
[✓] Android toolchain
[✓] Xcode
[✓] Chrome
[✓] Connected device
```

If not, run:
```bash
flutter pub get
flutter clean
flutter pub get
```

## Project Setup

```bash
cd mobile_app
```

### Get Dependencies
```bash
flutter pub get
```

### Build Configuration

Check `pubspec.yaml` for dependencies. Key packages:

- `http: ^1.2.2` for backend API calls
- `cupertino_icons` for iOS icon set
- `google_sign_in` for Google auth
- `sign_in_with_apple` for Apple auth

### iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

This installs CocoaPods dependencies for iOS.

For Apple sign-in support, also enable the **Sign In with Apple** capability in the iOS target.

### Social Sign-In Setup

Google and Apple sign-in call backend `POST /api/v1/auth/social` and exchange provider identity tokens for app JWTs.

Required backend env vars for verification:

- `GOOGLE_OAUTH_CLIENT_ID`
- `APPLE_SERVICE_ID`

Platform prerequisites:

- Google: configure OAuth client IDs for Android/iOS and ensure the app receives an ID token.
- Apple: configure Sign In with Apple capability and matching service identifiers.

Runtime behavior in app:
- Login sheet shows Email/Password plus `Sign in with Google` and `Sign in with Apple` actions.
- Provider tokens are exchanged only with backend `/api/v1/auth/social`; the app does not call protected APIs using provider tokens directly.
- On successful social login, mobile stores backend JWT access/refresh tokens exactly like password login.
- If backend rejects linking due to O5 policy checks (for example `409` conflict or `401` unverified email), the backend error message is surfaced in the login sheet.

## Running the App

### On Simulator/Emulator

**iOS Simulator** (macOS):
```bash
flutter run -d "iPhone 15 Pro"
```

**Android Emulator**:
```bash
flutter run -d "emulator-5554"
```

**Chrome (Web)**:
```bash
flutter run -d "chrome"
```

### On Physical Device

**iPhone**:
1. Connect iPhone via USB
2. Trust the computer (on device)
3. Run: `flutter devices` (verify device listed)
4. Run: `flutter run`

**Android**:
1. Enable USB debugging on device
2. Connect via USB
3. Run: `flutter devices` (verify device listed)
4. Run: `flutter run`
5. If you need backend access from device to local server, run: `adb reverse tcp:5000 tcp:5000` and then launch with `flutter run --dart-define=API_BASE_URL=http://127.0.0.1:5000`

No SIM card is required for local testing. You only need:
1. Device power and USB cable
2. Developer options + USB debugging enabled
3. Internet via Wi-Fi if your flow needs external APIs (Google/Apple auth or remote backend)

## Development Workflow

### Hot Reload (Fast Refresh)
While app is running, press `r` in terminal:
```
r         reload
R         restart
```

### Debug Mode
```bash
flutter run --debug
```

### Release Mode
```bash
flutter run --release
```

### Profile Mode (Performance Testing)
```bash
flutter run --profile
```

## Code Structure

```
mobile_app/
├── lib/
│   ├── main.dart               # App shell, feed state, refresh, pagination
│   ├── widgets/
│   │   └── news_card.dart      # Full-screen image + gradient text overlay
│   ├── models/
│   │   └── news_item.dart      # Mobile data model
│   ├── services/
│   │   └── news_api_service.dart  # POST /api/news/ingest client
├── test/                      # Unit & widget tests
├── pubspec.yaml              # Dependencies
└── README.md                 # App-specific docs
```

## Building for Release

### iOS Release Build
```bash
flutter build ios --release
```

Output: `build/ios/iphoneos/Runner.app`

To create IPA:
```bash
flutter build ipa --release
```

Output: `build/ios/ipa/`

### Android Release Build
```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Keep Latest APK In Repo (No CI Artifacts)

If you cannot use CI artifacts, you can publish a latest APK into a tracked repo path:

```bash
npm run mobile:publish-apk
```

This command:
1. Builds a release APK locally.
2. Copies it to `artifacts/mobile/android/app-release-latest.apk`.
3. Writes metadata to `artifacts/mobile/android/app-release-latest.json` with commit SHA, file size, and SHA256.

Then include it in your commit:

```bash
git add artifacts/mobile/android
git commit -m "chore: update latest mobile APK"
git push origin main
```

Recommendation: if repo size becomes a concern, move this APK path to Git LFS while keeping the same workflow.

If your local git pre-push hook is enabled, push now also validates APK freshness using `npm run mobile:apk-sync-check` and blocks if `mobile_app` code is newer than the committed `artifacts/mobile/android/app-release-latest.apk`.

Emergency bypass for a one-off push:

```bash
SKIP_APK_SYNC_CHECK=1 git push origin main
```

For Google Play (AAB format):
```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

### Android Size Analysis
Flutter code size analysis requires a single target ABI. The repository includes a repeatable helper script:

```bash
npm run mobile:size-check
```

By default this runs:

```bash
cd mobile_app
flutter build apk --release --analyze-size --target-platform android-arm64
```

Override the ABI when needed:

```bash
TARGET_PLATFORM=android-x64 npm run mobile:size-check
```

Use the generated size analysis output to confirm tree shaking stays effective after adding dependencies or new feature modules. CI now runs the same arm64 size-analysis build, enforces an initial 20 MB APK budget, and uploads the resulting JSON report plus APK as a workflow artifact.

The helper also copies the latest Flutter-generated `*-code-size-analysis_*.json` report into `mobile_app/build/size-analysis/` so the file is preserved in a stable repo-local path for CI artifact collection and local inspection.

CI now enforces both:
1. Absolute APK cap (`MAX_APK_SIZE_MB`, default 20 MB)
2. Relative growth trend gate (`MAX_APK_GROWTH_PERCENT`, default 4%) versus baseline in `mobile_app/env/apk-size-baseline.json`

Run the trend gate locally (after a size build):

```bash
npm run mobile:size-trend-check
```

Update baseline when intentionally shipping larger binaries:
1. Validate release intent and dependency/module justification.
2. Measure new arm64 APK size using `npm run mobile:size-check`.
3. Update `mobile_app/env/apk-size-baseline.json` with the approved `baselineBytes` and `capturedAt`.
4. Include rationale in PR notes so future trend deltas remain explainable.

## Backend Integration

Current integration uses `NewsApiService` with:

- Endpoint: `POST /api/news/ingest`
- Source cycling for pagination batches
- Pull-to-refresh for reloading first batch
- Vertical swipe pagination for appending more cards
- Image prefetching for upcoming cards

By default, API service connects to:
```
http://localhost:5000  (development)
https://api.vruttaant.app  (production)
```

Override API base URL at run time:

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:5000
```

Android emulator uses host loopback mapping:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000
```

### Example API Call Pattern
```dart
// services/news_api_service.dart
class NewsApiService {
  Future<List<NewsItem>> ingestAndFetchNews({required String sourceUrl}) async {
    // POST /api/news/ingest and map cardsPreview to NewsItem
  }
}
```

## Debugging

### Enable Verbose Logging
```bash
flutter run -v
```

### Dart DevTools (Inspector)
```bash
flutter pub global activate devtools
devtools
```

Then open in browser (URL printed), or use in VS Code:
```bash
flutter pub global run devtools
```

### Check Device Logs
```bash
flutter logs
```

## Common Issues

### Build Fails on iOS
```bash
cd ios
rm -rf Pods
pod install
cd ..
flutter clean
flutter pub get
flutter run
```

### Build Fails on Android
```bash
flutter clean
flutter pub get
flutter run
```

### CocoaPods Issues
```bash
# Update CocoaPods
sudo gem install cocoapods

# Clean pods
cd ios
rm -rf Pods
rm Podfile.lock
pod install
cd ..
```

## Testing

### Run All Tests
```bash
flutter test
```

### Run Specific Test File
```bash
flutter test test/widget_test.dart
```

### Coverage Report
```bash
flutter test --coverage
```

Coverage in `coverage/lcov.info`

## Localization (Multi-language)

Flutter localization strategy:
- Create `lib/l10n/app_en.arb` for English
- Create `lib/l10n/app_es.arb` for Spanish
- Create `lib/l10n/app_hi.arb` for Hindi
- etc.

Then generate with:
```bash
flutter gen-l10n
```

## Performance

### Profile App
```bash
flutter run --profile
```

Use DevTools Performance tab to track:
- Frame rate (target: 60 FPS on iOS, 120 FPS on iPad)
- Memory usage
- GPU/CPU metrics

### Optimize Images
- Use `flutter pub add cached_network_image`
- Implement lazy loading for news cards
- Cache images locally

## Next Steps
- Follow [SETUP.md](./SETUP.md) to start backend
- Extend mobile feed with bookmarking + local persistence
- Add a dedicated backend retrieval endpoint (`GET /api/news/cards`)
- Add language/source filters in feed
