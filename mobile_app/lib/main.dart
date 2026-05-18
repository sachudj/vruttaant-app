import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile_app/features/feed/domain/feed_types.dart';
import 'package:mobile_app/features/feed/presentation/news_feed_page.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/services/app_preferences_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, this.newsLoader, this.storyTranslator});

  final NewsLoader? newsLoader;
  final StoryTranslator? storyTranslator;

  @override
  Widget build(BuildContext context) {
    return _AppShell(newsLoader: newsLoader, storyTranslator: storyTranslator);
  }
}

class _AppShell extends StatefulWidget {
  const _AppShell({this.newsLoader, this.storyTranslator});

  final NewsLoader? newsLoader;
  final StoryTranslator? storyTranslator;

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  final AppPreferencesService _appPreferencesService = AppPreferencesService();
  ThemeMode _themeMode = ThemeMode.system;
  Locale _locale = const Locale('en');

  @override
  void initState() {
    super.initState();
    _restoreAppPreferences();
  }

  Future<void> _restoreAppPreferences() async {
    final loadedThemeMode = await _appPreferencesService.loadThemeMode();
    final loadedLocaleCode = await _appPreferencesService.loadLocaleCode();

    if (!mounted) return;
    setState(() {
      _themeMode = loadedThemeMode;
      _locale = _normalizeLocale(loadedLocaleCode);
    });
  }

  Locale _normalizeLocale(String languageCode) {
    final normalized = languageCode.trim().toLowerCase();
    final isSupported = AppLocalizations.supportedLocales.any(
      (element) => element.languageCode == normalized,
    );
    return Locale(isSupported ? normalized : 'en');
  }

  Future<void> _handleThemeModeChanged(ThemeMode mode) async {
    if (_themeMode == mode) {
      return;
    }

    setState(() {
      _themeMode = mode;
    });
    await _appPreferencesService.saveThemeMode(mode);
  }

  Future<void> _handleLanguageChanged(String languageCode) async {
    final nextLocale = _normalizeLocale(languageCode);
    if (_locale.languageCode == nextLocale.languageCode) {
      return;
    }

    setState(() {
      _locale = nextLocale;
    });
    await _appPreferencesService.saveLocaleCode(nextLocale.languageCode);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.indigo,
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: Colors.black,
        useMaterial3: true,
      ),
      themeMode: _themeMode,
      locale: _locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      debugShowCheckedModeBanner: false,
      home: NewsFeedPage(
        newsLoader: widget.newsLoader,
        storyTranslator: widget.storyTranslator,
        currentThemeMode: _themeMode,
        onThemeModeChanged: _handleThemeModeChanged,
        onLanguageChanged: _handleLanguageChanged,
      ),
    );
  }
}
