package com.example.vruttaant.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.nio.charset.StandardCharsets

class AuthRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("vruttaant_auth", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ACCESS_TOKEN = "auth_access_token"
        private const val KEY_REFRESH_TOKEN = "auth_refresh_token"
        private const val KEY_USER_EMAIL = "auth_user_email"
        private const val KEY_USER_ID = "auth_user_id"
        private const val REFRESH_BUFFER_MS = 60 * 1000
    }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_ACCESS_TOKEN, value).apply()

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_REFRESH_TOKEN, value).apply()

    var userEmail: String?
        get() = prefs.getString(KEY_USER_EMAIL, null)
        set(value) = prefs.edit().putString(KEY_USER_EMAIL, value).apply()

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) = prefs.edit().putString(KEY_USER_ID, value).apply()

    val isLoggedIn: Boolean
        get() = !accessToken.isNullOrEmpty()

    fun storeAuthSuccess(accessToken: String, refreshToken: String, email: String?, id: String?) {
        prefs.edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            putString(KEY_USER_EMAIL, email)
            putString(KEY_USER_ID, id)
        }.apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    fun isTokenExpiredOrExpiringSoon(): Boolean {
        val token = accessToken ?: return true
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return true
            val payloadJson = String(Base64.decode(parts[1], Base64.URL_SAFE), StandardCharsets.UTF_8)
            val jsonElement = Json.parseToJsonElement(payloadJson)
            val exp = jsonElement.jsonObject["exp"]?.jsonPrimitive?.content?.toLongOrNull() ?: return true
            val expiryMs = exp * 1000
            System.currentTimeMillis() >= (expiryMs - REFRESH_BUFFER_MS)
        } catch (e: Exception) {
            true
        }
    }
}
