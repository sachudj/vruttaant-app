package com.example.vruttaant.ui.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vruttaant.data.AuthRepository
import com.example.vruttaant.data.FeedCacheRepository
import com.example.vruttaant.data.PreferencesRepository
import com.example.vruttaant.data.api.NewsApiService
import com.example.vruttaant.data.model.AnalyticsEventRequest
import com.example.vruttaant.data.model.BookmarkRequest
import com.example.vruttaant.data.model.NewsItem
import com.example.vruttaant.data.model.TranslateRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

class FeedViewModel(
    private val apiService: NewsApiService,
    private val authRepository: AuthRepository,
    private val preferencesRepository: PreferencesRepository,
    private val cacheRepository: FeedCacheRepository
) : ViewModel() {

    private val defaultBufferThreshold = 10
    private val maxBufferThreshold = 18

    private val sessionId = "${System.currentTimeMillis()}-${(100000..999999).random()}"

    private val _feed = MutableStateFlow<List<NewsItem>>(emptyList())
    val feed: StateFlow<List<NewsItem>> = _feed.asStateFlow()

    private val _isInitialLoading = MutableStateFlow(true)
    val isInitialLoading: StateFlow<Boolean> = _isInitialLoading.asStateFlow()

    private val _isLoadingMore = MutableStateFlow(false)
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore.asStateFlow()

    private val _showingCachedFeed = MutableStateFlow(false)
    val showingCachedFeed: StateFlow<Boolean> = _showingCachedFeed.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _sort = MutableStateFlow("latest")
    val sort: StateFlow<String> = _sort.asStateFlow()

    private val _bookmarkedUrls = MutableStateFlow<Set<String>>(emptySet())
    val bookmarkedUrls: StateFlow<Set<String>> = _bookmarkedUrls.asStateFlow()

    private val _language = MutableStateFlow("en")
    val language: StateFlow<String> = _language.asStateFlow()

    private var currentPage = 1
    private var bufferThreshold = defaultBufferThreshold
    private var consecutiveFailures = 0

    // Tracking active card index for view event duration calculations
    private var activeIndex = -1
    private var activeStartTime = 0L

    init {
        _language.value = preferencesRepository.languageCode
        _selectedCategory.value = preferencesRepository.primaryCategory
    }

    fun setLanguage(lang: String) {
        if (_language.value != lang) {
            _language.value = lang
            preferencesRepository.languageCode = lang
            loadInitialFeed()
        }
    }

    fun selectCategory(category: String?) {
        if (_selectedCategory.value != category) {
            _selectedCategory.value = category
            loadInitialFeed()
        }
    }

    fun searchAndSort(query: String, sortMode: String) {
        if (_searchQuery.value != query || _sort.value != sortMode) {
            _searchQuery.value = query
            _sort.value = sortMode
            loadInitialFeed()
        }
    }

    fun loadInitialFeed() {
        _isInitialLoading.value = true
        _errorMessage.value = null
        currentPage = 1
        consecutiveFailures = 0
        bufferThreshold = defaultBufferThreshold

        val cacheKey = cacheRepository.buildCacheKey(
            language = _language.value,
            category = _selectedCategory.value,
            query = _searchQuery.value,
            sort = _sort.value
        )

        // 1. Try Cache First (45 minutes TTL)
        val cached = cacheRepository.loadFeed(cacheKey, maxAgeMinutes = 45)
        if (cached != null) {
            _feed.value = cached
            _showingCachedFeed.value = true
            _isInitialLoading.value = false
            syncBookmarks()
            trackActiveCard(0)
        }

        // 2. Fetch Fresh from Network
        viewModelScope.launch {
            try {
                var items = apiService.fetchCards(
                    language = _language.value,
                    category = _selectedCategory.value,
                    query = _searchQuery.value.takeIf { it.isNotEmpty() },
                    sort = _sort.value,
                    page = 1,
                    limit = 20
                ).cards.map { it.toNewsItem() }

                // Category fallback logic
                if (items.isEmpty() && _selectedCategory.value != null) {
                    items = apiService.fetchCards(
                        language = _language.value,
                        category = null,
                        query = _searchQuery.value.takeIf { it.isNotEmpty() },
                        sort = _sort.value,
                        page = 1,
                        limit = 20
                    ).cards.map { it.toNewsItem() }
                    _selectedCategory.value = null
                }

                if (items.isEmpty() && cached == null) {
                    _errorMessage.value = "No stories available for the selected filters."
                    _isInitialLoading.value = false
                    return@launch
                }

                if (items.isNotEmpty()) {
                    _feed.value = items
                    _showingCachedFeed.value = false
                    _isInitialLoading.value = false
                    _errorMessage.value = null
                    cacheRepository.saveFeed(cacheKey, items)
                    syncBookmarks()
                    trackActiveCard(0)
                }
            } catch (e: Exception) {
                if (cached == null) {
                    _errorMessage.value = e.localizedMessage ?: "Could not load news feed."
                    _isInitialLoading.value = false
                }
            }
        }
    }

    fun loadMoreIfNeeded(index: Int) {
        if (_isLoadingMore.value || _isInitialLoading.value || _feed.value.isEmpty()) return
        val remaining = _feed.value.size - 1 - index
        if (remaining > bufferThreshold) return

        _isLoadingMore.value = true
        val startTime = System.currentTimeMillis()

        viewModelScope.launch {
            try {
                val nextPage = currentPage + 1
                val incoming = apiService.fetchCards(
                    language = _language.value,
                    category = _selectedCategory.value,
                    query = _searchQuery.value.takeIf { it.isNotEmpty() },
                    sort = _sort.value,
                    page = nextPage,
                    limit = 20
                ).cards.map { it.toNewsItem() }

                val duration = (System.currentTimeMillis() - startTime).toInt()

                if (incoming.isEmpty()) {
                    _isLoadingMore.value = false
                    return@launch
                }

                val merged = mergeUnique(_feed.value, incoming)
                _feed.value = merged
                currentPage = nextPage
                consecutiveFailures = 0
                bufferThreshold = resolveAdaptiveThreshold(duration)
                _showingCachedFeed.value = false
                _isLoadingMore.value = false

                // Save cache snapshot
                val cacheKey = cacheRepository.buildCacheKey(
                    language = _language.value,
                    category = _selectedCategory.value,
                    query = _searchQuery.value,
                    sort = _sort.value
                )
                cacheRepository.saveFeed(cacheKey, merged)
            } catch (e: Exception) {
                consecutiveFailures++
                bufferThreshold = maxBufferThreshold
                _isLoadingMore.value = false
            }
        }
    }

    private fun resolveAdaptiveThreshold(fetchDurationMs: Int): Int {
        var threshold = defaultBufferThreshold
        if (fetchDurationMs > 2500) {
            threshold = 14
        } else if (fetchDurationMs > 1200) {
            threshold = 12
        } else if (fetchDurationMs < 500) {
            threshold = 8
        }
        if (consecutiveFailures > 0) {
            threshold += 2
        }
        return threshold.coerceIn(defaultBufferThreshold, maxBufferThreshold)
    }

    private fun mergeUnique(current: List<NewsItem>, incoming: List<NewsItem>): List<NewsItem> {
        val seen = mutableSetOf<String>()
        val result = mutableListOf<NewsItem>()
        for (item in current + incoming) {
            val key = "${item.url.orEmpty()}|${item.title}|${item.source}"
            if (seen.add(key)) {
                result.add(item)
            }
        }
        return result
    }

    fun syncBookmarks() {
        if (!authRepository.isLoggedIn) {
            _bookmarkedUrls.value = emptySet()
            return
        }

        viewModelScope.launch {
            try {
                val response = apiService.fetchBookmarks(page = 1, limit = 100)
                if (response.success) {
                    _bookmarkedUrls.value = response.data.bookmarks.map { it.url.trim() }.toSet()
                }
            } catch (e: Exception) {
                // Ignore background sync failure
            }
        }
    }

    fun toggleBookmark(item: NewsItem, onLoginRequired: () -> Unit) {
        if (!authRepository.isLoggedIn) {
            onLoginRequired()
            return
        }

        val url = item.originalUrl
        if (url.isEmpty()) return

        viewModelScope.launch {
            try {
                if (_bookmarkedUrls.value.contains(url)) {
                    // Find bookmark id
                    val bookmarksResponse = apiService.fetchBookmarks(page = 1, limit = 100)
                    val bookmark = bookmarksResponse.data.bookmarks.firstOrNull { it.url == url }
                    if (bookmark != null) {
                        apiService.deleteBookmark(bookmark.id)
                        _bookmarkedUrls.value = _bookmarkedUrls.value.minus(url)
                    }
                } else {
                    apiService.addBookmark(
                        BookmarkRequest(
                            title = item.title,
                            url = url,
                            summary = item.summary,
                            category = item.category,
                            imageUrl = item.imageUrl,
                            source = item.source,
                            language = item.language ?: "en"
                        )
                    )
                    _bookmarkedUrls.value = _bookmarkedUrls.value.plus(url)
                    trackAnalytics(item, "bookmark")
                }
            } catch (e: Exception) {
                // Fail silently
            }
        }
    }

    // Dynamic Translation Service call
    fun translateStory(item: NewsItem, onResult: (title: String, summary: String, isSuccess: Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                val response = apiService.translateStory(
                    TranslateRequest(
                        title = item.title,
                        summary = item.summary,
                        source = item.source,
                        url = item.originalUrl,
                        sourceLanguage = item.language ?: "en",
                        targetLanguage = _language.value
                    )
                )

                if (response.translated) {
                    onResult(response.data.title ?: item.title, response.data.summary ?: item.summary, true)
                    trackAnalytics(item, "translate", translationDetails = mapOf(
                        "fromLanguage" to (item.language ?: "en"),
                        "toLanguage" to _language.value
                    ))
                } else {
                    onResult(item.title, item.summary, false)
                }
            } catch (e: Exception) {
                onResult(item.title, item.summary, false)
            }
        }
    }

    // Analytics Tracking
    fun trackActiveCard(index: Int) {
        if (index < 0 || index >= _feed.value.size) return

        // Submit previous card duration
        if (activeIndex != -1 && activeStartTime != 0L) {
            val durationMs = (System.currentTimeMillis() - activeStartTime).toInt().coerceIn(0, 3600000)
            val prevItem = _feed.value.getOrNull(activeIndex)
            if (prevItem != null) {
                submitEvent(prevItem, "view", durationMs)
            }
        }

        activeIndex = index
        activeStartTime = System.currentTimeMillis()

        // Submit new card view event
        val currentItem = _feed.value[index]
        submitEvent(currentItem, "view")
    }

    fun trackShare(item: NewsItem) {
        submitEvent(item, "share")
    }

    private fun trackAnalytics(item: NewsItem, eventType: String, translationDetails: Map<String, String>? = null) {
        submitEvent(item, eventType, translation = translationDetails)
    }

    private fun submitEvent(
        item: NewsItem,
        eventType: String,
        durationMs: Int? = null,
        translation: Map<String, String>? = null
    ) {
        val cardId = item.analyticsCardId
        if (cardId.length != 24) return // Verify MongoDB ObjectId regex size

        val metadata = mapOf(
            "sessionId" to sessionId,
            "deviceType" to "mobile",
            "platform" to "android",
            "appLanguage" to _language.value
        )

        viewModelScope.launch {
            try {
                apiService.submitAnalyticsEvent(
                    AnalyticsEventRequest(
                        eventType = eventType,
                        newsCardId = cardId,
                        duration = durationMs,
                        translation = translation,
                        deviceMetadata = metadata
                    )
                )
            } catch (e: Exception) {
                // Non-blocking analytics
            }
        }
    }

    fun onDispose() {
        if (activeIndex != -1 && activeStartTime != 0L) {
            val durationMs = (System.currentTimeMillis() - activeStartTime).toInt().coerceIn(0, 3600000)
            val item = _feed.value.getOrNull(activeIndex)
            if (item != null) {
                submitEvent(item, "view", durationMs)
            }
        }
    }
}
