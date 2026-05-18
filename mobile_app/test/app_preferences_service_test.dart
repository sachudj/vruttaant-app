import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/services/app_preferences_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('stores and loads selected theme mode', () async {
    final service = AppPreferencesService();

    await service.saveThemeMode(ThemeMode.dark);
    final loaded = await service.loadThemeMode();

    expect(loaded, ThemeMode.dark);
  });

  test('stores and loads selected locale code', () async {
    final service = AppPreferencesService();

    await service.saveLocaleCode('hi');
    final loaded = await service.loadLocaleCode();

    expect(loaded, 'hi');
  });
}
