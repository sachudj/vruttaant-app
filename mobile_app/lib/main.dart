import 'package:flutter/material.dart';
import 'package:mobile_app/app/app_bootstrap_controller.dart';
import 'package:mobile_app/app/app_root.dart';
import 'package:mobile_app/features/feed/domain/feed_types.dart';
import 'package:mobile_app/features/feed/presentation/news_feed_page.dart';

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
  late final AppBootstrapController _bootstrapController;

  @override
  void initState() {
    super.initState();
    _bootstrapController = AppBootstrapController();
    _bootstrapController.initialize();
  }

  Future<void> _handleThemeModeChanged(ThemeMode mode) async {
    await _bootstrapController.setThemeMode(mode);
  }

  Future<void> _handleLanguageChanged(String languageCode) async {
    await _bootstrapController.setLanguageCode(languageCode);
  }

  @override
  void dispose() {
    _bootstrapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _bootstrapController,
      builder: (context, child) => AppRoot(
        themeMode: _bootstrapController.themeMode,
        locale: _bootstrapController.locale,
        home: NewsFeedPage(
          newsLoader: widget.newsLoader,
          storyTranslator: widget.storyTranslator,
          currentThemeMode: _bootstrapController.themeMode,
          onThemeModeChanged: _handleThemeModeChanged,
          onLanguageChanged: _handleLanguageChanged,
        ),
      ),
    );
  }
}
