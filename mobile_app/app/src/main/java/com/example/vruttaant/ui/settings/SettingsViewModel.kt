package com.example.vruttaant.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vruttaant.data.AuthRepository
import com.example.vruttaant.data.PreferencesRepository
import com.example.vruttaant.data.api.NewsApiService
import com.example.vruttaant.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface SettingsUiState {
    object Idle : SettingsUiState
    object Loading : SettingsUiState
    object Success : SettingsUiState
    data class Failure(val message: String) : SettingsUiState
}

class SettingsViewModel(
    private val apiService: NewsApiService,
    private val authRepository: AuthRepository,
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<SettingsUiState>(SettingsUiState.Idle)
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    // Preferences states
    private val _themeMode = MutableStateFlow("system")
    val themeMode: StateFlow<String> = _themeMode.asStateFlow()

    private val _languageCode = MutableStateFlow("en")
    val languageCode: StateFlow<String> = _languageCode.asStateFlow()

    private val _selectedCategories = MutableStateFlow<Set<String>>(emptySet())
    val selectedCategories: StateFlow<Set<String>> = _selectedCategories.asStateFlow()

    // Notification Preference states
    private val _notificationPrefs = MutableStateFlow(NotificationPrefs())
    val notificationPrefs: StateFlow<NotificationPrefs> = _notificationPrefs.asStateFlow()

    private val _registeredDevices = MutableStateFlow<List<DeviceItem>>(emptyList())
    val registeredDevices: StateFlow<List<DeviceItem>> = _registeredDevices.asStateFlow()

    // Activity stats states
    private val _activityStats = MutableStateFlow(ActivityStats())
    val activityStats: StateFlow<ActivityStats> = _activityStats.asStateFlow()

    private val _readingEvents = MutableStateFlow<List<ReadingEvent>>(emptyList())
    val readingEvents: StateFlow<List<ReadingEvent>> = _readingEvents.asStateFlow()

    val isLoggedIn: Boolean
        get() = authRepository.isLoggedIn

    val userEmail: String?
        get() = authRepository.userEmail

    init {
        loadLocalSettings()
    }

    fun loadLocalSettings() {
        _themeMode.value = preferencesRepository.themeMode
        _languageCode.value = preferencesRepository.languageCode
        _selectedCategories.value = preferencesRepository.onboardingCategories
    }

    fun loadRemoteSettings() {
        if (!isLoggedIn) return

        _uiState.value = SettingsUiState.Loading
        viewModelScope.launch {
            try {
                // 1. Sync Profile Preferences
                val profileResponse = apiService.fetchProfile()
                if (profileResponse.success && profileResponse.profile != null) {
                    val prefs = profileResponse.profile.preferences
                    prefs?.language?.let {
                        _languageCode.value = it
                        preferencesRepository.languageCode = it
                    }
                    prefs?.categories?.let {
                        val set = it.toSet()
                        _selectedCategories.value = set
                        preferencesRepository.onboardingCategories = set
                    }
                }

                // 2. Fetch Notifications
                val notifResponse = apiService.fetchNotificationPreferences()
                if (notifResponse.success) {
                    _notificationPrefs.value = notifResponse.data.notifications
                }

                // 3. Fetch Registered Devices
                val devicesResponse = apiService.fetchNotificationDevices()
                if (devicesResponse.success) {
                    _registeredDevices.value = devicesResponse.data.devices
                }

                // 4. Fetch Activity Stats
                val statsResponse = apiService.fetchActivityStats()
                if (statsResponse.success) {
                    _activityStats.value = statsResponse.data.stats
                }

                // 5. Fetch Recent Reading Events
                val readingResponse = apiService.fetchReadingFeed(limit = 8)
                if (readingResponse.success) {
                    _readingEvents.value = readingResponse.data.readingEvents
                }

                _uiState.value = SettingsUiState.Success
            } catch (e: Exception) {
                _uiState.value = SettingsUiState.Failure(e.localizedMessage ?: "Failed to sync settings.")
            }
        }
    }

    fun saveSettings(
        theme: String,
        language: String,
        categories: Set<String>,
        onSaved: () -> Unit
    ) {
        _uiState.value = SettingsUiState.Loading
        viewModelScope.launch {
            try {
                // Save locally first
                preferencesRepository.themeMode = theme
                preferencesRepository.languageCode = language
                preferencesRepository.onboardingCategories = categories
                _themeMode.value = theme
                _languageCode.value = language
                _selectedCategories.value = categories

                // Sync to Server if logged in
                if (isLoggedIn) {
                    apiService.updateProfile(
                        UpdateProfileRequest(
                            ProfilePreferences(
                                language = language,
                                categories = categories.toList()
                            )
                        )
                    )
                }

                _uiState.value = SettingsUiState.Success
                onSaved()
            } catch (e: Exception) {
                _uiState.value = SettingsUiState.Failure(e.localizedMessage ?: "Failed to save settings.")
            }
        }
    }

    fun updateNotificationPreferences(updatedPrefs: NotificationPrefs) {
        _notificationPrefs.value = updatedPrefs
        if (!isLoggedIn) return

        viewModelScope.launch {
            try {
                apiService.updateNotificationPreferences(
                    UpdateNotificationPreferencesRequest(updatedPrefs)
                )
            } catch (e: Exception) {
                // Silent catch
            }
        }
    }

    fun deleteDevice(deviceId: String) {
        viewModelScope.launch {
            try {
                val response = apiService.deleteNotificationDevice(deviceId)
                if (response.success) {
                    _registeredDevices.value = _registeredDevices.value.filter { it.deviceId != deviceId }
                }
            } catch (e: Exception) {
                // Silent catch
            }
        }
    }

    fun signOut(onComplete: () -> Unit) {
        viewModelScope.launch {
            val rToken = authRepository.refreshToken
            if (!rToken.isNullOrEmpty()) {
                try {
                    apiService.logout(LogoutRequest(rToken))
                } catch (e: Exception) {
                    // Ignore logout API failures, clean locally anyway
                }
            }
            authRepository.clear()
            loadLocalSettings()
            onComplete()
        }
    }

    fun resetOnboarding(onComplete: () -> Unit) {
        preferencesRepository.onboardingCompleted = false
        onComplete()
    }
}
