import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppPreferencesService {
  static const _themeModeKey = 'app_theme_mode';
  static const _localeCodeKey = 'app_locale_code';
  static const _onboardingCompletedKey = 'onboarding_completed';
  static const _onboardingPrimaryCategoryKey = 'onboarding_primary_category';
  static const _onboardingCategoriesKey = 'onboarding_categories';

  Future<ThemeMode> loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_themeModeKey) ?? 'system';
    return _themeModeFromCode(stored);
  }

  Future<void> saveThemeMode(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeModeKey, _themeModeToCode(mode));
  }

  Future<String> loadLocaleCode() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getString(_localeCodeKey) ?? 'en').trim().toLowerCase();
  }

  Future<void> saveLocaleCode(String localeCode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeCodeKey, localeCode.trim().toLowerCase());
  }

  Future<bool> loadOnboardingCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_onboardingCompletedKey) ?? false;
  }

  Future<void> saveOnboardingCompleted(bool completed) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingCompletedKey, completed);
  }

  Future<String?> loadOnboardingPrimaryCategory() async {
    final prefs = await SharedPreferences.getInstance();
    final category = (prefs.getString(_onboardingPrimaryCategoryKey) ?? '')
        .trim();
    return category.isEmpty ? null : category;
  }

  Future<List<String>> loadOnboardingCategories() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_onboardingCategoriesKey) ?? const <String>[])
        .map((category) => category.trim())
        .where((category) => category.isNotEmpty)
        .toSet()
        .toList(growable: false);
  }

  Future<void> saveOnboardingPrimaryCategory(String? category) async {
    final prefs = await SharedPreferences.getInstance();
    final cleaned = (category ?? '').trim();
    if (cleaned.isEmpty) {
      await prefs.remove(_onboardingPrimaryCategoryKey);
      return;
    }
    await prefs.setString(_onboardingPrimaryCategoryKey, cleaned);
  }

  Future<void> saveOnboardingCategories(List<String> categories) async {
    final prefs = await SharedPreferences.getInstance();
    final cleaned = categories
        .map((category) => category.trim())
        .where((category) => category.isNotEmpty)
        .toSet()
        .toList(growable: false);

    if (cleaned.isEmpty) {
      await prefs.remove(_onboardingCategoriesKey);
      return;
    }

    await prefs.setStringList(_onboardingCategoriesKey, cleaned);
  }

  static ThemeMode _themeModeFromCode(String code) {
    switch (code.trim().toLowerCase()) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _themeModeToCode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}
