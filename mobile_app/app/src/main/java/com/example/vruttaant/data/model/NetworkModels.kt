package com.example.vruttaant.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class SocialLoginRequest(
    val provider: String,
    val idToken: String,
    val nonce: String? = null
)

@Serializable
data class RefreshRequest(
    val refreshToken: String
)

@Serializable
data class LogoutRequest(
    val refreshToken: String
)

@Serializable
data class IngestRequest(
    val url: String,
    val language: String = "en",
    val maxItems: Int = 20,
    val persist: Boolean = true
)

@Serializable
data class TranslateRequest(
    val title: String,
    val summary: String,
    val source: String,
    val url: String,
    val sourceLanguage: String,
    val targetLanguage: String
)

@Serializable
data class TranslateResponse(
    val translated: Boolean,
    val data: TranslateData
)

@Serializable
data class TranslateData(
    val title: String? = null,
    val summary: String? = null,
    val language: String? = null,
    val fallbackReason: String? = null
)

@Serializable
data class AnalyticsEventRequest(
    val eventType: String,
    val newsCardId: String,
    val duration: Int? = null,
    val translation: Map<String, String>? = null,
    val deviceMetadata: Map<String, String>? = null
)

@Serializable
data class BookmarkRequest(
    val title: String,
    val url: String,
    val summary: String,
    val category: String,
    val imageUrl: String,
    val source: String,
    val language: String
)

@Serializable
data class ProfilePreferences(
    val language: String? = null,
    val categories: List<String>? = null
)

@Serializable
data class UpdateProfileRequest(
    val preferences: ProfilePreferences
)

@Serializable
data class ProfileResponse(
    val success: Boolean = true,
    val profile: UserProfileData? = null
)

@Serializable
data class UserProfileData(
    val email: String? = null,
    val preferences: ProfilePreferences? = null
)

@Serializable
data class ActivityStatsResponse(
    val success: Boolean = true,
    val data: ActivityStatsData
)

@Serializable
data class ActivityStatsData(
    val stats: ActivityStats
)

@Serializable
data class ActivityStats(
    val totalViews: Int = 0,
    val totalBookmarks: Int = 0,
    val totalTranslations: Int = 0,
    val totalShares: Int = 0,
    val lastActive: String? = null
)

@Serializable
data class ReadingFeedResponse(
    val success: Boolean = true,
    val data: ReadingFeedData
)

@Serializable
data class ReadingFeedData(
    val readingEvents: List<ReadingEvent>
)

@Serializable
data class ReadingEvent(
    val _id: String? = null,
    val newsCard: NewsCardNetwork? = null,
    val createdAt: String? = null
)

@Serializable
data class NotificationPreferencesResponse(
    val success: Boolean = true,
    val data: NotificationPreferencesData
)

@Serializable
data class NotificationPreferencesData(
    val notifications: NotificationPrefs
)

@Serializable
data class NotificationPrefs(
    val enabled: Boolean = true,
    val breakingNews: Boolean = true,
    val bookmarkAlerts: Boolean = true,
    val dailyDigest: Boolean = false,
    val quietHours: QuietHoursPrefs = QuietHoursPrefs()
)

@Serializable
data class QuietHoursPrefs(
    val enabled: Boolean = false,
    val start: String = "22:00",
    val end: String = "07:00",
    val timezone: String = "UTC"
)

@Serializable
data class UpdateNotificationPreferencesRequest(
    val notifications: NotificationPrefs
)

@Serializable
data class DeviceRegisterRequest(
    val token: String,
    val platform: String = "android",
    val deviceName: String? = null
)

@Serializable
data class DevicesResponse(
    val success: Boolean = true,
    val data: DevicesListData
)

@Serializable
data class DevicesListData(
    val devices: List<DeviceItem>
)

@Serializable
data class DeviceItem(
    val id: String? = null,
    val _id: String? = null,
    val token: String,
    val platform: String,
    val deviceName: String? = null,
    val createdAt: String? = null
) {
    val deviceId: String
        get() = id ?: _id ?: ""
}

@Serializable
data class NewsCardsResponse(
    val success: Boolean = true,
    val cards: List<NewsCardNetwork> = emptyList()
)

@Serializable
data class BookmarksResponse(
    val success: Boolean = true,
    val data: BookmarksListData
)

@Serializable
data class BookmarksListData(
    val bookmarks: List<BookmarkItem> = emptyList()
)

@Serializable
data class GenericResponse(
    val success: Boolean = true,
    val message: String? = null,
    val error: ErrorDetails? = null
)

@Serializable
data class ErrorDetails(
    val message: String? = null
)

@Serializable
data class AuthResponse(
    val success: Boolean = true,
    val message: String? = null,
    val data: AuthData? = null,
    val error: ErrorDetails? = null
)

@Serializable
data class AuthData(
    val tokens: AuthTokens,
    val user: AuthUser
)

@Serializable
data class AuthTokens(
    val accessToken: String,
    val refreshToken: String
)

@Serializable
data class AuthUser(
    val id: String,
    val email: String
)

@Serializable
data class RefreshResponse(
    val success: Boolean = true,
    val data: RefreshData? = null,
    val error: ErrorDetails? = null
)

@Serializable
data class RefreshData(
    val tokens: AuthTokens
)
