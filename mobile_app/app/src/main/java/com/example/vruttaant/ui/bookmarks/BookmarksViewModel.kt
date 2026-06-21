package com.example.vruttaant.ui.bookmarks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vruttaant.data.AuthRepository
import com.example.vruttaant.data.api.NewsApiService
import com.example.vruttaant.data.model.BookmarkItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface BookmarksState {
    object Idle : BookmarksState
    object Loading : BookmarksState
    data class Success(val list: List<BookmarkItem>) : BookmarksState
    data class Failure(val message: String) : BookmarksState
}

class BookmarksViewModel(
    private val apiService: NewsApiService,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow<BookmarksState>(BookmarksState.Idle)
    val state: StateFlow<BookmarksState> = _state.asStateFlow()

    fun loadBookmarks() {
        if (!authRepository.isLoggedIn) {
            _state.value = BookmarksState.Success(emptyList())
            return
        }

        _state.value = BookmarksState.Loading
        viewModelScope.launch {
            try {
                val response = apiService.fetchBookmarks(page = 1, limit = 100)
                if (response.success) {
                    _state.value = BookmarksState.Success(response.data.bookmarks)
                } else {
                    _state.value = BookmarksState.Failure("Failed to fetch bookmarks.")
                }
            } catch (e: Exception) {
                _state.value = BookmarksState.Failure(e.localizedMessage ?: "Unknown error occurred.")
            }
        }
    }

    fun removeBookmark(id: String, onRemoved: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = apiService.deleteBookmark(id)
                if (response.success) {
                    // Reload bookmarks list after deletion
                    loadBookmarks()
                    onRemoved()
                }
            } catch (e: Exception) {
                // Fail silently or toast handled in UI
            }
        }
    }
}
