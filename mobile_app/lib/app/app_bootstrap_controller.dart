import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/services/app_preferences_service.dart';

class AppBootstrapController extends ChangeNotifier {
  AppBootstrapController({AppPreferencesService? appPreferencesService})
    : _appPreferencesService = appPreferencesService ?? AppPreferencesService();

  final AppPreferencesService _appPreferencesService;

  ThemeMode _themeMode = ThemeMode.system;
  Locale _locale = const Locale('en');

  ThemeMode get themeMode => _themeMode;
  Locale get locale => _locale;

  Future<void> initialize() async {
    final loadedThemeMode = await _appPreferencesService.loadThemeMode();
    final loadedLocaleCode = await _appPreferencesService.loadLocaleCode();

    _themeMode = loadedThemeMode;
    _locale = _normalizeLocale(loadedLocaleCode);
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) {
      return;
    }

    _themeMode = mode;
    notifyListeners();
    await _appPreferencesService.saveThemeMode(mode);
  }

  Future<void> setLanguageCode(String languageCode) async {
    final nextLocale = _normalizeLocale(languageCode);
    if (_locale.languageCode == nextLocale.languageCode) {
      return;
    }

    _locale = nextLocale;
    notifyListeners();
    await _appPreferencesService.saveLocaleCode(nextLocale.languageCode);
  }

  Locale _normalizeLocale(String languageCode) {
    final normalized = languageCode.trim().toLowerCase();
    final isSupported = AppLocalizations.supportedLocales.any(
      (element) => element.languageCode == normalized,
    );
    return Locale(isSupported ? normalized : 'en');
  }
}
