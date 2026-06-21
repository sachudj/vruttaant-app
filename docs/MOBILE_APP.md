# Native Android Mobile App Setup

## Overview
Native Android mobile application built using **Kotlin** and **Jetpack Compose** for browsing news in an InShorts-style vertical card-based swipe interface. The app connects to the Node.js backend to fetch, translate, bookmark, and cache news cards.

---

## Prerequisites
- **Android Studio**: Android Studio Ladybug (2024.2.1+) or newer.
- **Java Development Kit (JDK)**: JDK 17+ (JDK 21 recommended).
- **Android SDK**: Compile SDK 36, Target SDK 36, Minimum SDK 24 (Android 7.0+).
- **Google Services File**: An active `google-services.json` inside the `app/` folder to authorize Firebase Cloud Messaging (FCM).

---

## Project Structure

The codebase is located in the `mobile_app/` folder, structured under the namespace `com.example.vruttaant`:

```
mobile_app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml     # Application manifest & entrypoints
│   │   │   ├── java/com/example/vruttaant/
│   │   │   │   ├── MainActivity.kt     # App entry point
│   │   │   │   ├── Navigation.kt       # NavHost definitions & routes
│   │   │   │   ├── data/               # Data layer repositories & cache
│   │   │   │   │   ├── api/            # Retrofit Service & interceptors
│   │   │   │   │   ├── model/          # Serializable news/user schemas
│   │   │   │   │   ├── AuthRepository.kt
│   │   │   │   │   ├── FeedCacheRepository.kt
│   │   │   │   │   └── PreferencesRepository.kt
│   │   │   │   ├── ui/                 # Jetpack Compose MVVM View layer
│   │   │   │   │   ├── feed/           # FeedScreen + FeedViewModel
│   │   │   │   │   ├── bookmarks/      # BookmarksSheet + BookmarksViewModel
│   │   │   │   │   ├── auth/           # LoginSheet + AuthViewModel
│   │   │   │   │   ├── onboarding/     # OnboardingScreen + OnboardingViewModel
│   │   │   │   │   ├── settings/       # SettingsScreen + SettingsViewModel
│   │   │   │   │   └── theme/          # HSL themes & Localizations
│   │   │   │   └── service/            # MyFirebaseMessagingService (FCM)
│   │   │   └── res/                    # Drawables, layouts, launcher icons
│   │   └── test/                       # Local JVM unit tests (JUnit, Coroutine tests)
│   └── build.gradle.kts                # App build configuration
├── gradle/
│   └── libs.versions.toml              # Version catalog dependencies
├── settings.gradle.kts                 # Multi-project gradle configuration
└── gradlew                             # Gradle wrapper executable
```

---

## Dependencies & Version Catalog

The app uses standard version-cataloged libraries defined in [libs.versions.toml](file:///Users/sachinjoshi/Documents/Personal/vruttaant-app/mobile_app/gradle/libs.versions.toml):
- **Compose**: Jetpack Compose BOM (Material3, Icons, Tooling, Pager).
- **Navigation**: androidx.navigation3 (runtime, ui, viewmodel integration).
- **Networking**: Retrofit 2 + OkHttp 4 client with kotlinx.serialization converter.
- **Image Loading**: Coil 3 (Compose-compatible).
- **Data Caching & Persistence**: androidx.datastore (preferences).
- **Firebase**: Firebase BOM, Firebase Cloud Messaging (FCM).

---

## Developing & Running the App

### 1. Development Mode (Emulator/Device)
Open the `mobile_app` folder in Android Studio and run the app. Alternatively, compile and install from the terminal:

```bash
cd mobile_app
# Compile and install on a connected emulator/device
./gradlew installDebug
```

### 2. Run Local Unit Tests
Run the JUnit and Coroutines tests:

```bash
cd mobile_app
./gradlew testDebugUnitTest
```

---

## Release Building & Packaging

### 1. Build a Release APK
Compile a release APK signed with the debug key:

```bash
cd mobile_app
./gradlew :app:assembleRelease
```
Output location: `app/build/outputs/apk/release/app-release.apk`

### 2. Local Size & Trend Checks

The repository defines helper scripts (managed in `package.json`) to gate APK size additions:

```bash
# Verify absolute package size is under 20MB
npm run mobile:size-check

# Verify size trend has not grown more than 4% compared to baseline
npm run mobile:size-trend-check
```
*Gating baselines are read from `mobile_app/env/apk-size-baseline.json`.*

### 3. Publish APK
To publish a signed release APK and write metadata to `artifacts/mobile/android/`:

```bash
npm run mobile:publish-apk
```
This updates [app-release-latest.apk](file:///Users/sachinjoshi/Documents/Personal/vruttaant-app/artifacts/mobile/android/app-release-latest.apk) and [app-release-latest.json](file:///Users/sachinjoshi/Documents/Personal/vruttaant-app/artifacts/mobile/android/app-release-latest.json).

Commit the updated APK and metadata:
```bash
git add artifacts/mobile/android
git commit -m "chore: update latest mobile APK"
git push
```

---

## Key Core Integrations

### Localization (Dynamic Language Swapper)
Unlike standard Android resource-bound localization, the app uses a custom translation mapping ([Localizations.kt](file:///Users/sachinjoshi/Documents/Personal/vruttaant-app/mobile_app/app/src/main/java/com/example/vruttaant/ui/theme/Localizations.kt)) supporting:
- Dynamic, in-app language swapper settings.
- Real-time updates without restarting the application context.

### Network Authentication & Auto-refresh Interceptor
- `AuthInterceptor` automatically appends JWT tokens to request headers.
- Automatically handles expired JWTs. If a request returns `401 Unauthorized`, it calls `POST /api/v1/auth/token/refresh` using a stored refresh token and retries the failed request thread-safely.
