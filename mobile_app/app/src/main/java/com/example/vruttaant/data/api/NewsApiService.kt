package com.example.vruttaant.data.api

import com.example.vruttaant.data.model.*
import retrofit2.Call
import retrofit2.http.*

interface NewsApiService {

    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("api/v1/auth/social")
    suspend fun loginSocial(@Body request: SocialLoginRequest): AuthResponse

    @POST("api/v1/auth/logout")
    suspend fun logout(@Body request: LogoutRequest): GenericResponse

    // Synchronous call for the authenticator/interceptor refresh flow
    @POST("api/v1/auth/refresh")
    fun refreshSync(@Body request: RefreshRequest): Call<RefreshResponse>

    @POST("api/v1/news/ingest")
    suspend fun ingestNews(@Body request: IngestRequest): GenericResponse

    @GET("api/v1/news/cards")
    suspend fun fetchCards(
        @Query("language") language: String,
        @Query("category") category: String?,
        @Query("q") query: String?,
        @Query("sort") sort: String,
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): NewsCardsResponse

    @POST("api/v1/news/translate")
    suspend fun translateStory(@Body request: TranslateRequest): TranslateResponse

    @POST("api/v1/analytics/events")
    suspend fun submitAnalyticsEvent(@Body request: AnalyticsEventRequest): GenericResponse

    @POST("api/v1/user/bookmarks")
    suspend fun addBookmark(@Body request: BookmarkRequest): GenericResponse

    @GET("api/v1/user/bookmarks")
    suspend fun fetchBookmarks(
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): BookmarksResponse

    @DELETE("api/v1/user/bookmarks/{id}")
    suspend fun deleteBookmark(@Path("id") id: String): GenericResponse

    @GET("api/v1/user/profile")
    suspend fun fetchProfile(): ProfileResponse

    @PATCH("api/v1/user/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): GenericResponse

    @GET("api/v1/user/activity/stats")
    suspend fun fetchActivityStats(): ActivityStatsResponse

    @GET("api/v1/user/activity/reading-feed")
    suspend fun fetchReadingFeed(@Query("limit") limit: Int): ReadingFeedResponse

    @GET("api/v1/user/notifications/preferences")
    suspend fun fetchNotificationPreferences(): NotificationPreferencesResponse

    @PATCH("api/v1/user/notifications/preferences")
    suspend fun updateNotificationPreferences(@Body request: UpdateNotificationPreferencesRequest): NotificationPreferencesResponse

    @POST("api/v1/user/notifications/devices")
    suspend fun registerNotificationDevice(@Body request: DeviceRegisterRequest): GenericResponse

    @GET("api/v1/user/notifications/devices")
    suspend fun fetchNotificationDevices(): DevicesResponse

    @DELETE("api/v1/user/notifications/devices/{id}")
    suspend fun deleteNotificationDevice(@Path("id") id: String): GenericResponse
}
