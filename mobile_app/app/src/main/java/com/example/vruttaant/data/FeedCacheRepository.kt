package com.example.vruttaant.data

import android.content.Context
import android.content.SharedPreferences
import com.example.vruttaant.data.model.NewsItem
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class FeedCacheSnapshot(
    val items: List<NewsItem>,
    val savedAt: String // ISO 8601 UTC string
)

class FeedCacheRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("vruttaant_feed_cache", Context.MODE_PRIVATE)

    companion object {
        private const val STORAGE_PREFIX = "feed_cache_v1::"
        private val json = Json { ignoreUnknownKeys = true }
    }

    private fun storageKeyFor(cacheKey: String): String {
        return "$STORAGE_PREFIX$cacheKey"
    }

    fun buildCacheKey(
        language: String,
        category: String?,
        query: String?,
        sort: String
    ): String {
        val normalizedLanguage = language.trim().lowercase()
        val normalizedCategory = category?.trim()?.lowercase() ?: ""
        val normalizedQuery = query?.trim()?.lowercase() ?: ""
        val normalizedSort = sort.trim().lowercase()

        return listOf(
            normalizedLanguage,
            if (normalizedCategory.isEmpty()) "all" else normalizedCategory,
            if (normalizedQuery.isEmpty()) "none" else normalizedQuery,
            if (normalizedSort.isEmpty()) "latest" else normalizedSort
        ).joinToString("::")
    }

    fun saveFeed(cacheKey: String, items: List<NewsItem>) {
        val formatter = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
        formatter.timeZone = java.util.TimeZone.getTimeZone("UTC")
        val savedAtStr = formatter.format(java.util.Date())

        val snapshot = FeedCacheSnapshot(items, savedAtStr)
        val raw = json.encodeToString(FeedCacheSnapshot.serializer(), snapshot)
        prefs.edit().putString(storageKeyFor(cacheKey), raw).apply()
    }

    fun loadFeed(cacheKey: String, maxAgeMinutes: Long): List<NewsItem>? {
        val raw = prefs.getString(storageKeyFor(cacheKey), null) ?: return null
        if (raw.trim().isEmpty()) return null

        return try {
            val snapshot = json.decodeFromString(FeedCacheSnapshot.serializer(), raw)
            val formatter = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
            formatter.timeZone = java.util.TimeZone.getTimeZone("UTC")
            val parsedSavedAt = formatter.parse(snapshot.savedAt) ?: return null

            val ageMs = System.currentTimeMillis() - parsedSavedAt.time
            val maxAgeMs = maxAgeMinutes * 60 * 1000
            if (ageMs > maxAgeMs) {
                // Cache expired
                null
            } else {
                snapshot.items
            }
        } catch (e: Exception) {
            null
        }
    }

    fun clearFeed(cacheKey: String) {
        prefs.edit().remove(storageKeyFor(cacheKey)).apply()
    }
}
