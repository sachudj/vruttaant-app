package com.example.vruttaant.data

import android.content.Context
import android.content.SharedPreferences

class PreferencesRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("vruttaant_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ONBOARDING_COMPLETED = "onboarding_completed"
        private const val KEY_ONBOARDING_CATEGORIES = "onboarding_categories"
        private const val KEY_PRIMARY_CATEGORY = "primary_category"
        private const val KEY_THEME_MODE = "theme_mode"
        private const val KEY_LANGUAGE_CODE = "language_code"
    }

    var onboardingCompleted: Boolean
        get() = prefs.getBoolean(KEY_ONBOARDING_COMPLETED, false)
        set(value) = prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETED, value).apply()

    var onboardingCategories: Set<String>
        get() = prefs.getStringSet(KEY_ONBOARDING_CATEGORIES, emptySet()) ?: emptySet()
        set(value) = prefs.edit().putStringSet(KEY_ONBOARDING_CATEGORIES, value).apply()

    var primaryCategory: String?
        get() = prefs.getString(KEY_PRIMARY_CATEGORY, null)
        set(value) = prefs.edit().putString(KEY_PRIMARY_CATEGORY, value).apply()

    var themeMode: String
        get() = prefs.getString(KEY_THEME_MODE, "system") ?: "system"
        set(value) = prefs.edit().putString(KEY_THEME_MODE, value).apply()

    var languageCode: String
        get() = prefs.getString(KEY_LANGUAGE_CODE, "en") ?: "en"
        set(value) = prefs.edit().putString(KEY_LANGUAGE_CODE, value).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }
}
