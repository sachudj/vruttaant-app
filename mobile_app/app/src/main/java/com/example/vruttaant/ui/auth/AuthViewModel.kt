package com.example.vruttaant.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vruttaant.data.AuthRepository
import com.example.vruttaant.data.api.NewsApiService
import com.example.vruttaant.data.model.LoginRequest
import com.example.vruttaant.data.model.SocialLoginRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface AuthState {
    object Idle : AuthState
    object Loading : AuthState
    object Success : AuthState
    data class Failure(val message: String) : AuthState
}

class AuthViewModel(
    private val apiService: NewsApiService,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    fun resetState() {
        _authState.value = AuthState.Idle
    }

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Failure("Email and password cannot be empty.")
            return
        }

        _authState.value = AuthState.Loading
        viewModelScope.launch {
            try {
                val response = apiService.login(LoginRequest(email.trim(), password))
                if (response.success && response.data != null) {
                    val data = response.data
                    authRepository.storeAuthSuccess(
                        accessToken = data.tokens.accessToken,
                        refreshToken = data.tokens.refreshToken,
                        email = data.user.email,
                        id = data.user.id
                    )
                    _authState.value = AuthState.Success
                    onSuccess()
                } else {
                    val errorMsg = response.error?.message ?: response.message ?: "Authentication failed."
                    _authState.value = AuthState.Failure(errorMsg)
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Failure("Network error: ${e.localizedMessage ?: "Unknown error"}")
            }
        }
    }

    fun loginWithSocial(provider: String, idToken: String, nonce: String? = null, onSuccess: () -> Unit) {
        _authState.value = AuthState.Loading
        viewModelScope.launch {
            try {
                val response = apiService.loginSocial(SocialLoginRequest(provider, idToken, nonce))
                if (response.success && response.data != null) {
                    val data = response.data
                    authRepository.storeAuthSuccess(
                        accessToken = data.tokens.accessToken,
                        refreshToken = data.tokens.refreshToken,
                        email = data.user.email,
                        id = data.user.id
                    )
                    _authState.value = AuthState.Success
                    onSuccess()
                } else {
                    val errorMsg = response.error?.message ?: response.message ?: "Social login failed."
                    _authState.value = AuthState.Failure(errorMsg)
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Failure("Network error: ${e.localizedMessage ?: "Unknown error"}")
            }
        }
    }
}
