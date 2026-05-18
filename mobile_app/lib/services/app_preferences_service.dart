import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppPreferencesService {
  static const _themeModeKey = 'app_theme_mode';
  static const _localeCodeKey = 'app_locale_code';

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
