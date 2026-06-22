package com.example.vruttaant

import com.example.vruttaant.data.FeedCacheRepository
import com.example.vruttaant.data.model.BookmarkItem
import com.example.vruttaant.data.model.NewsCardNetwork
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.mockito.Mockito.mock
import android.content.Context
import android.content.SharedPreferences

class FeedModelsAndCacheTest {

    @Test
    fun testNewsCardNetworkMapping() {
        val networkCard = NewsCardNetwork(
            _id = "507f1f77bcf86cd799439011",
            title = "  Test Title  ",
            aiSummary = "   AI Summary text...  ",
            imageUrl = "",
            source = "Source",
            category = "Business",
            url = "http://example.com/news",
            language = "en",
            readingTime = 5
        )

        val newsItem = networkCard.toNewsItem()

        assertEquals("507f1f77bcf86cd799439011", newsItem.id)
        assertEquals("Test Title", newsItem.title)
        assertEquals("AI Summary text...", newsItem.summary)
        // Fallback for empty image URL
        assertEquals("", newsItem.imageUrl)
        assertEquals("Source", newsItem.source)
        assertEquals("Business", newsItem.category)
        assertEquals("http://example.com/news", newsItem.url)
        assertEquals("en", newsItem.language)
        assertEquals(5, newsItem.readingTime)
    }

    @Test
    fun testBookmarkMapping() {
        val bookmark = BookmarkItem(
            id = "b123",
            title = "Bookmark Title",
            url = "http://example.com/bookmark",
            summary = "Summary text",
            category = "Tech",
            imageUrl = "http://example.com/image.jpg",
            source = "TechSource",
            language = "en"
        )

        val newsItem = bookmark.toNewsItem()

        assertEquals(null, newsItem.id)
        assertEquals("Bookmark Title", newsItem.title)
        assertEquals("http://example.com/bookmark", newsItem.originalUrl)
        assertEquals("Summary text", newsItem.summary)
        assertEquals("Tech", newsItem.category)
        assertEquals("http://example.com/image.jpg", newsItem.imageUrl)
        assertEquals("TechSource", newsItem.source)
        assertEquals("en", newsItem.language)
    }

    @Test
    fun testCacheKeyBuilding() {
        // We mock Context and SharedPreferences to instantiate FeedCacheRepository
        val mockContext = mock(Context::class.java)
        val mockPrefs = mock(SharedPreferences::class.java)
        org.mockito.Mockito.`when`(mockContext.getSharedPreferences("vruttaant_feed_cache", Context.MODE_PRIVATE))
            .thenReturn(mockPrefs)

        val repo = FeedCacheRepository(mockContext)

        val key = repo.buildCacheKey(
            language = "EN ",
            category = "Business",
            query = "  Election",
            sort = "Latest"
        )

        assertEquals("en::business::election::latest", key)

        val keyAll = repo.buildCacheKey(
            language = "hi",
            category = null,
            query = "",
            sort = "relevance"
        )

        assertEquals("hi::all::none::relevance", keyAll)
    }
}
