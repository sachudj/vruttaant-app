import 'package:flutter/material.dart';
import 'package:mobile_app/app/app_bootstrap_controller.dart';
import 'package:mobile_app/app/app_root.dart';
import 'package:mobile_app/app/onboarding_intro_page.dart';
import 'package:mobile_app/features/feed/domain/feed_types.dart';
import 'package:mobile_app/features/feed/presentation/news_feed_page.dart';
import 'package:mobile_app/services/app_preferences_service.dart';

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
  final AppPreferencesService _appPreferencesService = AppPreferencesService();

  bool _isBootstrapped = false;
  bool _showOnboarding = false;
  List<String> _onboardingCategories = const <String>[];

  @override
  void initState() {
    super.initState();
    _bootstrapController = AppBootstrapController();
    _initializeShell();
  }

  Future<void> _initializeShell() async {
    await _bootstrapController.initialize();
    final completed = await _appPreferencesService.loadOnboardingCompleted();
    final onboardingCategories = await _appPreferencesService
        .loadOnboardingCategories();

    if (!mounted) return;
    setState(() {
      _showOnboarding = !completed;
      _onboardingCategories = onboardingCategories;
      _isBootstrapped = true;
    });
  }

  Future<void> _handleOnboardingComplete(
    List<String> selectedCategories,
  ) async {
    final cleaned = selectedCategories
        .map((category) => category.trim())
        .where((category) => category.isNotEmpty)
        .toSet()
        .toList(growable: false);

    final primaryCategory = cleaned.isEmpty ? null : cleaned.first;
    await _appPreferencesService.saveOnboardingPrimaryCategory(primaryCategory);
    await _appPreferencesService.saveOnboardingCategories(cleaned);
    await _appPreferencesService.saveOnboardingCompleted(true);

    if (!mounted) return;
    setState(() {
      _showOnboarding = false;
      _onboardingCategories = cleaned;
    });
  }

  Future<void> _handleResetOnboardingRequested() async {
    await _appPreferencesService.saveOnboardingCompleted(false);

    if (!mounted) return;
    setState(() {
      _showOnboarding = true;
    });
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
      builder: (context, child) {
        final home = !_isBootstrapped
            ? const Scaffold(body: Center(child: CircularProgressIndicator()))
            : _showOnboarding
            ? OnboardingIntroPage(onContinue: _handleOnboardingComplete)
            : NewsFeedPage(
                newsLoader: widget.newsLoader,
                storyTranslator: widget.storyTranslator,
                currentThemeMode: _bootstrapController.themeMode,
                onThemeModeChanged: _handleThemeModeChanged,
                onLanguageChanged: _handleLanguageChanged,
                onResetOnboardingRequested: _handleResetOnboardingRequested,
                initialCategory: _onboardingCategories.isEmpty
                    ? null
                    : _onboardingCategories.first,
                initialPreferredCategories: _onboardingCategories,
              );

        return AppRoot(
          themeMode: _bootstrapController.themeMode,
          locale: _bootstrapController.locale,
          home: home,
        );
      },
    );
  }
}
