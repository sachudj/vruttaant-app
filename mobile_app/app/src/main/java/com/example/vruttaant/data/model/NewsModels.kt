package com.example.vruttaant.data.model

import kotlinx.serialization.Serializable

@Serializable
data class NewsItem(
    val id: String?,
    val title: String,
    val summary: String,
    val imageUrl: String,
    val source: String,
    val category: String,
    val url: String?,
    val language: String?,
    val readingTime: Int?
) {
    val originalUrl: String
        get() = url?.trim().orEmpty()

    val analyticsCardId: String
        get() = id?.trim().orEmpty()
}

@Serializable
data class NewsCardNetwork(
    val _id: String? = null,
    val id: String? = null,
    val title: String? = null,
    val summary: String? = null,
    val aiSummary: String? = null,
    val imageUrl: String? = null,
    val source: String? = null,
    val category: String? = null,
    val url: String? = null,
    val language: String? = null,
    val readingTime: Int? = null
) {
    fun toNewsItem(): NewsItem {
        val finalId = _id ?: id
        val finalTitle = title?.trim()?.takeIf { it.isNotEmpty() } ?: "Untitled"
        val finalSummary = aiSummary?.trim()?.takeIf { it.isNotEmpty() } 
            ?: summary?.trim()?.takeIf { it.isNotEmpty() } 
            ?: "No summary available."
        val finalImageUrl = imageUrl?.trim()?.takeIf { it.isNotEmpty() } ?: ""
        val finalSource = source?.trim()?.takeIf { it.isNotEmpty() } ?: "Unknown Source"
        val finalCategory = category?.trim()?.takeIf { it.isNotEmpty() } ?: "General"
        
        return NewsItem(
            id = finalId,
            title = finalTitle,
            summary = finalSummary,
            imageUrl = finalImageUrl,
            source = finalSource,
            category = finalCategory,
            url = url,
            language = language,
            readingTime = readingTime
        )
    }
}

@Serializable
data class BookmarkItem(
    val id: String,
    val title: String,
    val url: String,
    val summary: String,
    val category: String,
    val imageUrl: String,
    val source: String,
    val language: String
) {
    fun toNewsItem(): NewsItem {
        return NewsItem(
            id = null,
            title = title,
            summary = summary,
            imageUrl = imageUrl,
            source = source,
            category = category,
            url = url,
            language = language,
            readingTime = null
        )
    }
}
