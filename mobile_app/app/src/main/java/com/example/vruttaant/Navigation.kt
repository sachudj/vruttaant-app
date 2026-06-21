package com.example.vruttaant

import com.example.mobile_app.BuildConfig
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.vruttaant.data.AuthRepository
import com.example.vruttaant.data.FeedCacheRepository
import com.example.vruttaant.data.PreferencesRepository
import com.example.vruttaant.data.api.AuthInterceptor
import com.example.vruttaant.data.api.NewsApiService
import com.example.vruttaant.ui.auth.AuthViewModel
import com.example.vruttaant.ui.bookmarks.BookmarksViewModel
import com.example.vruttaant.ui.feed.FeedScreen
import com.example.vruttaant.ui.feed.FeedViewModel
import com.example.vruttaant.ui.onboarding.OnboardingScreen
import com.example.vruttaant.ui.onboarding.OnboardingViewModel
import com.example.vruttaant.ui.settings.SettingsScreen
import com.example.vruttaant.ui.settings.SettingsViewModel
import com.example.vruttaant.ui.theme.LocalAppLanguage
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

private fun resolveBaseUrl(): String {
    val url = BuildConfig.API_BASE_URL
    val isEmulator = android.os.Build.FINGERPRINT.startsWith("generic")
        || android.os.Build.FINGERPRINT.startsWith("unknown")
        || android.os.Build.MODEL.contains("google_sdk")
        || android.os.Build.MODEL.contains("Emulator")
        || android.os.Build.MODEL.contains("Android SDK built for x86")

    return if (isEmulator && (url.contains("localhost") || url.contains("127.0.0.1"))) {
        url.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2")
    } else {
        url
    }
}

@Composable
fun MainNavigation() {
    val context = LocalContext.current

    // 1. Setup Data Layers & APIs
    val baseUrl = remember { resolveBaseUrl() }
    val authRepository = remember { AuthRepository(context) }
    val preferencesRepository = remember { PreferencesRepository(context) }
    val cacheRepository = remember { FeedCacheRepository(context) }

    val apiService = remember {
        val authInterceptor = AuthInterceptor(authRepository, baseUrl)
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.HEADERS
        }
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()

        val json = Json { ignoreUnknownKeys = true }
        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        retrofit.create(NewsApiService::class.java)
    }

    // 2. Instantiate ViewModels (retained within navigation lifetime)
    val onboardingViewModel = remember { OnboardingViewModel(preferencesRepository) }
    val authViewModel = remember { AuthViewModel(apiService, authRepository) }
    val bookmarksViewModel = remember { BookmarksViewModel(apiService, authRepository) }
    val feedViewModel = remember { FeedViewModel(apiService, authRepository, preferencesRepository, cacheRepository) }
    val settingsViewModel = remember { SettingsViewModel(apiService, authRepository, preferencesRepository) }

    // 3. Dynamic App language context provider
    var currentLanguage by remember { mutableStateOf(preferencesRepository.languageCode) }

    // Navigation backstack setup
    val startDestination = if (preferencesRepository.onboardingCompleted) Feed else Onboarding
    val backStack = rememberNavBackStack(startDestination)

    CompositionLocalProvider(LocalAppLanguage provides currentLanguage) {
        NavDisplay(
            backStack = backStack,
            onBack = { backStack.removeLastOrNull() },
            entryProvider = entryProvider {
                entry<Onboarding> {
                    OnboardingScreen(
                        viewModel = onboardingViewModel,
                        onComplete = {
                            // Update feed configuration & navigate
                            feedViewModel.loadInitialFeed()
                            backStack.add(Feed)
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
                entry<Feed> {
                    FeedScreen(
                        viewModel = feedViewModel,
                        authViewModel = authViewModel,
                        bookmarksViewModel = bookmarksViewModel,
                        onSettingsClick = {
                            settingsViewModel.loadLocalSettings()
                            backStack.add(Settings)
                        },
                        onOpenBookmark = { newsItem ->
                            // Optional: load bookmarked news card directly
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
                entry<Settings> {
                    SettingsScreen(
                        viewModel = settingsViewModel,
                        onBackClick = {
                            // Sync language changes & reload feed
                            val nextLang = preferencesRepository.languageCode
                            if (currentLanguage != nextLang) {
                                currentLanguage = nextLang
                                feedViewModel.setLanguage(nextLang)
                            } else {
                                feedViewModel.loadInitialFeed()
                            }
                            backStack.removeLastOrNull()
                        },
                        onSignInRequired = {
                            // Optional: login prompt from settings
                        },
                        onResetOnboardingComplete = {
                            onboardingViewModel.finishOnboarding { } // Clear temp selections
                            currentLanguage = preferencesRepository.languageCode
                            backStack.add(Onboarding)
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        )
    }
}
