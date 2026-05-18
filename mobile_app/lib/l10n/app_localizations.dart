import 'package:flutter/material.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const supportedLocales = [Locale('en'), Locale('hi')];

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static AppLocalizations of(BuildContext context) {
    final localizations = Localizations.of<AppLocalizations>(
      context,
      AppLocalizations,
    );
    return localizations ?? AppLocalizations(const Locale('en'));
  }

  static const Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'app_title': 'Vruttaant',
      'settings': 'Settings',
      'save': 'Save',
      'theme': 'Theme',
      'theme_system': 'System',
      'theme_light': 'Light',
      'theme_dark': 'Dark',
    },
    'hi': {
      'app_title': 'वृत्तांत',
      'settings': 'सेटिंग्स',
      'save': 'सेव करें',
      'theme': 'थीम',
      'theme_system': 'सिस्टम',
      'theme_light': 'लाइट',
      'theme_dark': 'डार्क',
    },
  };

  String _t(String key) {
    final lang = locale.languageCode.toLowerCase();
    final map = _localizedValues[lang] ?? _localizedValues['en']!;
    return map[key] ?? _localizedValues['en']![key] ?? key;
  }

  String get appTitle => _t('app_title');
  String get settings => _t('settings');
  String get save => _t('save');
  String get theme => _t('theme');
  String get themeSystem => _t('theme_system');
  String get themeLight => _t('theme_light');
  String get themeDark => _t('theme_dark');
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => AppLocalizations.supportedLocales.any(
    (element) => element.languageCode == locale.languageCode,
  );

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) {
    return false;
  }
}
