import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile_app/features/reader/presentation/story_pager.dart';
import 'package:mobile_app/features/settings/presentation/settings_profile_page.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/models/bookmark_item.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/app_preferences_service.dart';
import 'package:mobile_app/services/auth_service.dart';
import 'package:mobile_app/services/feed_cache_service.dart';
import 'package:mobile_app/services/news_api_service.dart';
import 'package:mobile_app/services/push_notification_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

typedef NewsLoader = Future<List<NewsItem>> Function(int page);
typedef StoryTranslator =
    Future<StoryTranslationResult> Function(
      NewsItem news,
      String targetLanguage,
    );

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

class NewsFeedPage extends StatefulWidget {
  const NewsFeedPage({
    super.key,
    this.newsLoader,
    this.storyTranslator,
    this.currentThemeMode = ThemeMode.system,
    this.onThemeModeChanged,
    this.onLanguageChanged,
  });

  final NewsLoader? newsLoader;
  final StoryTranslator? storyTranslator;
  final ThemeMode currentThemeMode;
  final Future<void> Function(ThemeMode mode)? onThemeModeChanged;
  final Future<void> Function(String languageCode)? onLanguageChanged;

  @override
  State<NewsFeedPage> createState() => _NewsFeedPageState();
}

class _NewsFeedPageState extends State<NewsFeedPage> {
  static const Duration _feedCacheTtl = Duration(minutes: 45);

  final AuthService _authService = AuthService(
    baseUrl: const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:5000',
    ),
  );
  late final NewsApiService _newsApiService;
  late final FeedCacheService _feedCacheService;
  final PageController _pageController = PageController();
  final List<NewsItem> _feed = [];
  final List<BookmarkItem> _bookmarks = [];
  final Set<String> _bookmarkedUrls = <String>{};

  static const List<String?> _categories = [
    null,
    'Tech',
    'Politics',
    'Sports',
    'Business',
    'World',
    'Health',
    'Entertainment',
    'Science',
    'Education',
    'General',
  ];

  static const List<String> _profileCategoryOptions = [
    'Tech',
    'Politics',
    'Sports',
    'Business',
    'World',
    'Health',
    'Entertainment',
    'Science',
    'Education',
    'General',
  ];

  bool _isInitialLoading = true;
  bool _isLoadingMore = false;
  bool _isBookmarkSheetLoading = false;
  bool _showingCachedFeed = false;
  DateTime? _cachedFeedAt;
  String? _errorMessage;
  int _currentPage = 1;
  String _language = 'en';
  List<String> _preferredCategories = <String>[];
  String? _selectedCategory;
  String _searchQuery = '';
  String _sort = 'latest';
  late final PushNotificationService _pushService;

  @override
  void initState() {
    super.initState();
    _newsApiService = NewsApiService(authService: _authService);
    _feedCacheService = FeedCacheService();
    _pushService = PushNotificationService(_newsApiService);
    _initApp();
  }

  String _currentFeedCacheKey() {
    return _feedCacheService.buildCacheKey(
      language: _language,
      category: _selectedCategory,
      query: _searchQuery,
      sort: _sort,
    );
  }

  Future<void> _initApp() async {
    await _authService.init();
    await _pushService.initialize();

    await _syncProfileFromServer(updateState: false);
    await _loadInitialFeed();
  }

  Future<void> _syncProfileFromServer({bool updateState = true}) async {
    if (!_newsApiService.hasAccessToken) {
      return;
    }

    try {
      final profileData = await _newsApiService.fetchProfile();
      final profile = profileData['profile'];
      final prefs = profile is Map<String, dynamic>
          ? profile['preferences'] as Map<String, dynamic>?
          : null;
      if (prefs == null) {
        return;
      }

      final profileLang = prefs['language'] as String?;
      final profileCategories = (prefs['categories'] as List?)
          ?.whereType<String>()
          .map((c) => c.trim())
          .where((c) => c.isNotEmpty)
          .toSet()
          .toList(growable: false);

      final nextLanguage = (profileLang != null && profileLang.isNotEmpty)
          ? profileLang
          : _language;
      final nextCategories = profileCategories ?? _preferredCategories;

      if (!updateState || !mounted) {
        _language = nextLanguage;
        _preferredCategories = nextCategories;
        return;
      }

      setState(() {
        _language = nextLanguage;
        _preferredCategories = nextCategories;
      });
    } catch (_) {
      // Keep feed usable even if profile API is unavailable.
    }
  }

  Future<List<NewsItem>> _fetchNewsPage(int page) {
    final loader = widget.newsLoader;
    if (loader != null) {
      return loader(page - 1);
    }

    return _newsApiService.fetchCards(
      language: _language,
      category: _selectedCategory,
      q: _searchQuery.isEmpty ? null : _searchQuery,
      sort: _sort,
      page: page,
      limit: 20,
    );
  }

  Future<StoryTranslationResult> _translateNewsItem(NewsItem news) {
    final translator = widget.storyTranslator;
    if (translator != null) {
      return translator(news, _language);
    }

    return _newsApiService.translateStory(
      item: news,
      targetLanguage: _language,
    );
  }

  List<NewsItem> _mergeUnique(List<NewsItem> current, List<NewsItem> incoming) {
    final seen = <String>{};
    final merged = <NewsItem>[];

    for (final item in [...current, ...incoming]) {
      final key = '${item.url ?? ''}|${item.title}|${item.source}';
      if (seen.add(key)) {
        merged.add(item);
      }
    }

    return merged;
  }

  Future<void> _loadInitialFeed() async {
    final localizations = AppLocalizations.of(context);

    setState(() {
      _isInitialLoading = true;
      _errorMessage = null;
    });

    final cacheKey = _currentFeedCacheKey();
    final cachedSnapshot = await _feedCacheService.loadFeed(
      cacheKey: cacheKey,
      maxAge: _feedCacheTtl,
    );

    if (cachedSnapshot != null && mounted) {
      setState(() {
        _feed
          ..clear()
          ..addAll(cachedSnapshot.items);
        _currentPage = 1;
        _isInitialLoading = false;
        _showingCachedFeed = true;
        _cachedFeedAt = cachedSnapshot.savedAt;
        _errorMessage = null;
      });
    }

    try {
      var firstPage = await _fetchNewsPage(1);

      if (firstPage.isEmpty) {
        throw Exception(localizations.noStoriesForFilters);
      }

      if (!mounted) return;

      setState(() {
        _feed
          ..clear()
          ..addAll(firstPage);
        _currentPage = 1;
        _isInitialLoading = false;
        _showingCachedFeed = false;
        _cachedFeedAt = null;
      });
      await _feedCacheService.saveFeed(cacheKey: cacheKey, items: firstPage);
      await _refreshBookmarks();
    } catch (error) {
      if (!mounted) return;

      if (cachedSnapshot != null) {
        setState(() {
          _isInitialLoading = false;
          _showingCachedFeed = true;
          _cachedFeedAt = cachedSnapshot.savedAt;
          _errorMessage = null;
        });
        return;
      }

      setState(() {
        _errorMessage = '$error';
        _isInitialLoading = false;
      });
    }
  }

  Future<void> _loadMoreIfNeeded(int index) async {
    if (_isLoadingMore || _isInitialLoading) return;
    if (_feed.isEmpty) return;
    if (index < _feed.length - 2) return;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      final nextPage = _currentPage + 1;
      final incoming = await _fetchNewsPage(nextPage);
      if (!mounted) return;

      if (incoming.isEmpty) {
        setState(() {
          _isLoadingMore = false;
        });
        return;
      }

      final mergedFeed = _mergeUnique(_feed, incoming);

      setState(() {
        _feed
          ..clear()
          ..addAll(mergedFeed);
        _currentPage = nextPage;
        _isLoadingMore = false;
        _showingCachedFeed = false;
        _cachedFeedAt = null;
      });

      await _feedCacheService.saveFeed(
        cacheKey: _currentFeedCacheKey(),
        items: mergedFeed,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoadingMore = false;
      });
    }
  }

  void _prefetchImageIfPossible(List<NewsItem> feed, int index) {
    if (!mounted) return;
    if (index < 0 || index >= feed.length) return;

    final bindingType = WidgetsBinding.instance.runtimeType.toString();
    if (bindingType.contains('TestWidgetsFlutterBinding')) {
      return;
    }

    final imageUrl = feed[index].imageUrl;
    if (imageUrl.isEmpty) return;

    precacheImage(NetworkImage(imageUrl), context).catchError((
      error,
      stackTrace,
    ) {
      return;
    });
  }

  Future<void> _onRefresh() async {
    await _loadInitialFeed();
  }

  Future<void> _onCategorySelected(String? category) async {
    if (_selectedCategory == category) return;

    setState(() {
      _selectedCategory = category;
    });

    await _loadInitialFeed();
  }

  Future<void> _openSearchSheet() async {
    final localizations = AppLocalizations.of(context);
    var pendingQuery = _searchQuery;
    var pendingSort = _sort;

    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF121212),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return SafeArea(
              child: SingleChildScrollView(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: 16,
                    right: 16,
                    top: 12,
                    bottom: MediaQuery.of(context).viewInsets.bottom + 16,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        localizations.searchSort,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const ValueKey('search-query-input'),
                        initialValue: pendingQuery,
                        onChanged: (value) {
                          pendingQuery = value;
                        },
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: localizations.searchHint,
                          hintStyle: const TextStyle(color: Colors.white54),
                          filled: true,
                          fillColor: Colors.white.withValues(alpha: 0.08),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          prefixIcon: const Icon(
                            Icons.search,
                            color: Colors.white70,
                          ),
                        ),
                        textInputAction: TextInputAction.search,
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        children: [
                          ChoiceChip(
                            label: Text(localizations.sortLatest),
                            selected: pendingSort == 'latest',
                            onSelected: (_) {
                              setModalState(() {
                                pendingSort = 'latest';
                              });
                            },
                          ),
                          ChoiceChip(
                            label: Text(localizations.sortRelevance),
                            selected: pendingSort == 'relevance',
                            onSelected: (_) {
                              setModalState(() {
                                pendingSort = 'relevance';
                              });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          TextButton(
                            onPressed: () {
                              Navigator.of(
                                context,
                              ).pop({'q': '', 'sort': 'latest'});
                            },
                            child: Text(localizations.clear),
                          ),
                          const Spacer(),
                          FilledButton(
                            onPressed: () {
                              Navigator.of(context).pop({
                                'q': pendingQuery.trim(),
                                'sort': pendingSort,
                              });
                            },
                            child: Text(localizations.apply),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (result == null) {
      return;
    }

    final nextQuery = (result['q'] ?? '').trim();
    final nextSort = (result['sort'] ?? 'latest').trim().toLowerCase();

    if (nextQuery == _searchQuery && nextSort == _sort) {
      return;
    }

    if (!mounted) return;
    setState(() {
      _searchQuery = nextQuery;
      _sort = (nextSort == 'relevance') ? 'relevance' : 'latest';
    });
    await _loadInitialFeed();
  }

  Future<void> _openLoginSheet() async {
    final localizations = AppLocalizations.of(context);
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    String? loginError;
    bool isLoading = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF121212),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            Future<void> doLogin() async {
              setModalState(() {
                isLoading = true;
                loginError = null;
              });
              final result = await _authService.login(
                emailController.text,
                passwordController.text,
              );
              if (!context.mounted) return;
              if (result.success) {
                Navigator.of(context).pop();
                if (mounted) setState(() {});
                await _syncProfileFromServer();
                await _refreshBookmarks();
              } else {
                setModalState(() {
                  loginError = result.errorMessage;
                  isLoading = false;
                });
              }
            }

            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 20,
                  right: 20,
                  top: 24,
                  bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      localizations.signIn,
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 20,
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: localizations.email,
                        labelStyle: TextStyle(color: Colors.white70),
                        enabledBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Colors.white30),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Colors.indigoAccent),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: passwordController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: localizations.password,
                        labelStyle: TextStyle(color: Colors.white70),
                        enabledBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Colors.white30),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Colors.indigoAccent),
                        ),
                      ),
                      onSubmitted: (_) => doLogin(),
                    ),
                    if (loginError != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        loginError!,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: isLoading ? null : doLogin,
                      child: isLoading
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(localizations.signIn),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _refreshBookmarks() async {
    if (!_newsApiService.hasAccessToken) {
      if (!mounted) return;
      setState(() {
        _bookmarks.clear();
        _bookmarkedUrls.clear();
      });
      return;
    }

    try {
      final bookmarks = await _newsApiService.fetchBookmarks();
      if (!mounted) return;
      setState(() {
        _bookmarks
          ..clear()
          ..addAll(bookmarks);
        _bookmarkedUrls
          ..clear()
          ..addAll(
            bookmarks.map((b) => b.url.trim()).where((u) => u.isNotEmpty),
          );
      });
    } catch (_) {
      // Keep feed usable even if bookmark API is unavailable.
    }
  }

  bool _isBookmarked(NewsItem news) {
    final url = news.originalUrl;
    if (url.isEmpty) return false;
    return _bookmarkedUrls.contains(url);
  }

  Future<void> _toggleBookmark(NewsItem news) async {
    final localizations = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final url = news.originalUrl;

    if (!_newsApiService.hasAccessToken) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(localizations.signInToBookmark),
          action: SnackBarAction(
            label: localizations.signIn,
            onPressed: _openLoginSheet,
          ),
        ),
      );
      return;
    }

    if (url.isEmpty) {
      messenger.showSnackBar(
        SnackBar(content: Text(localizations.bookmarkMissingUrl)),
      );
      return;
    }

    try {
      if (_bookmarkedUrls.contains(url)) {
        final existing = _bookmarks
            .where((b) => b.url == url)
            .toList(growable: false);
        if (existing.isNotEmpty) {
          await _newsApiService.deleteBookmark(existing.first.id);
        }
        if (!mounted) return;
        setState(() {
          _bookmarks.removeWhere((b) => b.url == url);
          _bookmarkedUrls.remove(url);
        });
        messenger.showSnackBar(
          SnackBar(content: Text(localizations.bookmarkRemoved)),
        );
        return;
      }

      final created = await _newsApiService.addBookmark(news);
      await _refreshBookmarks();
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            created
                ? localizations.bookmarked
                : localizations.alreadyBookmarked,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Map<String, dynamic> _defaultNotificationPreferences() {
    return {
      'enabled': true,
      'breakingNews': true,
      'bookmarkAlerts': true,
      'dailyDigest': false,
      'quietHours': {
        'enabled': false,
        'start': '22:00',
        'end': '07:00',
        'timezone': 'UTC',
      },
    };
  }

  Map<String, dynamic> _normalizeNotificationPreferences(
    Map<String, dynamic>? incoming,
  ) {
    final defaults = _defaultNotificationPreferences();
    final source = incoming ?? <String, dynamic>{};
    final sourceQuiet = source['quietHours'];
    final quietHours = sourceQuiet is Map<String, dynamic>
        ? sourceQuiet
        : <String, dynamic>{};
    final defaultQuiet = defaults['quietHours'] as Map<String, dynamic>;

    return {
      'enabled': source['enabled'] is bool
          ? source['enabled']
          : defaults['enabled'],
      'breakingNews': source['breakingNews'] is bool
          ? source['breakingNews']
          : defaults['breakingNews'],
      'bookmarkAlerts': source['bookmarkAlerts'] is bool
          ? source['bookmarkAlerts']
          : defaults['bookmarkAlerts'],
      'dailyDigest': source['dailyDigest'] is bool
          ? source['dailyDigest']
          : defaults['dailyDigest'],
      'quietHours': {
        'enabled': quietHours['enabled'] is bool
            ? quietHours['enabled']
            : defaultQuiet['enabled'],
        'start':
            quietHours['start'] is String &&
                (quietHours['start'] as String).trim().isNotEmpty
            ? (quietHours['start'] as String).trim()
            : defaultQuiet['start'],
        'end':
            quietHours['end'] is String &&
                (quietHours['end'] as String).trim().isNotEmpty
            ? (quietHours['end'] as String).trim()
            : defaultQuiet['end'],
        'timezone':
            quietHours['timezone'] is String &&
                (quietHours['timezone'] as String).trim().isNotEmpty
            ? (quietHours['timezone'] as String).trim()
            : defaultQuiet['timezone'],
      },
    };
  }

  Future<void> _openSettingsSheet() async {
    final localizations = AppLocalizations.of(context);
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (_) => SettingsProfilePage(
          authService: _authService,
          newsApiService: _newsApiService,
          currentLanguage: _language,
          currentCategories: _preferredCategories,
          defaultNotificationPreferences: _defaultNotificationPreferences(),
          normalizeNotificationPreferences: _normalizeNotificationPreferences,
          categoryOptions: _profileCategoryOptions,
          currentThemeMode: widget.currentThemeMode,
        ),
      ),
    );

    if (result == null || !mounted) return;

    if (result['signInRequested'] == true) {
      await _openLoginSheet();
      await _syncProfileFromServer();
      return;
    }

    if (result['signedOut'] == true) {
      setState(() {
        _bookmarks.clear();
        _bookmarkedUrls.clear();
        _preferredCategories = <String>[];
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(localizations.signedOut)));
      return;
    }

    final selectedLanguage = result['language'] as String?;
    final selectedCategories = (result['categories'] as List?)
        ?.whereType<String>()
        .toList(growable: false);
    final selectedThemeModeCode = (result['themeMode'] as String?)?.trim();

    var shouldReloadFeed = false;

    if (selectedLanguage != null && selectedLanguage != _language) {
      setState(() {
        _language = selectedLanguage;
      });
      shouldReloadFeed = true;

      final onLanguageChanged = widget.onLanguageChanged;
      if (onLanguageChanged != null) {
        await onLanguageChanged(selectedLanguage);
      }
    }

    if (selectedCategories != null) {
      setState(() {
        _preferredCategories = selectedCategories;
      });
    }

    if (selectedThemeModeCode != null) {
      final nextThemeMode = switch (selectedThemeModeCode.toLowerCase()) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };

      final onThemeModeChanged = widget.onThemeModeChanged;
      if (onThemeModeChanged != null) {
        await onThemeModeChanged(nextThemeMode);
      }
    }

    if (shouldReloadFeed) {
      await _loadInitialFeed();
    }
  }

  Future<void> _openBookmarksSheet() async {
    final localizations = AppLocalizations.of(context);
    if (!_newsApiService.hasAccessToken) {
      await _openLoginSheet();
      if (!mounted || !_authService.isLoggedIn) return;
    }

    setState(() {
      _isBookmarkSheetLoading = true;
    });
    await _refreshBookmarks();
    if (!mounted) return;
    setState(() {
      _isBookmarkSheetLoading = false;
    });

    final selected = await showModalBottomSheet<BookmarkItem>(
      context: context,
      backgroundColor: const Color(0xFF121212),
      isScrollControlled: true,
      builder: (context) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.75,
            child: Column(
              children: [
                const SizedBox(height: 10),
                Text(
                  localizations.bookmarks,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 8),
                const Divider(color: Colors.white24, height: 1),
                Expanded(
                  child: _bookmarks.isEmpty
                      ? Center(
                          child: Text(
                            localizations.noBookmarks,
                            style: TextStyle(color: Colors.white70),
                          ),
                        )
                      : ListView.separated(
                          itemCount: _bookmarks.length,
                          separatorBuilder: (_, index) =>
                              const Divider(color: Colors.white12, height: 1),
                          itemBuilder: (context, index) {
                            final bookmark = _bookmarks[index];
                            return ListTile(
                              title: Text(
                                bookmark.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white),
                              ),
                              subtitle: Text(
                                bookmark.source,
                                style: const TextStyle(color: Colors.white70),
                              ),
                              trailing: IconButton(
                                icon: const Icon(
                                  Icons.delete_outline,
                                  color: Colors.white70,
                                ),
                                onPressed: () async {
                                  await _newsApiService.deleteBookmark(
                                    bookmark.id,
                                  );
                                  if (!mounted) return;
                                  setState(() {
                                    _bookmarks.removeWhere(
                                      (b) => b.id == bookmark.id,
                                    );
                                    _bookmarkedUrls.remove(bookmark.url);
                                  });
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        localizations.bookmarkRemoved,
                                      ),
                                    ),
                                  );
                                },
                              ),
                              onTap: () => Navigator.of(context).pop(bookmark),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (selected == null || !mounted) {
      return;
    }

    final news = selected.toNewsItem();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StoryPager(
          news: news,
          isBookmarked: true,
          onBookmarkPressed: () async {},
          onTranslateRequested: _translateNewsItem,
        ),
      ),
    );
  }

  String _formatCachedFeedTimestamp(BuildContext context, DateTime savedAt) {
    final materialLocalizations = MaterialLocalizations.of(context);
    final localTime = savedAt.toLocal();
    final timeOfDay = TimeOfDay.fromDateTime(localTime);
    final alwaysUse24HourFormat =
        MediaQuery.maybeOf(context)?.alwaysUse24HourFormat ?? false;

    return materialLocalizations.formatTimeOfDay(
      timeOfDay,
      alwaysUse24HourFormat: alwaysUse24HourFormat,
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return Scaffold(
      body: Builder(
        builder: (context) {
          if (_isInitialLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Colors.white),
            );
          }

          if (_errorMessage != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      localizations.feedLoadFailed,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.white70),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _loadInitialFeed,
                      child: Text(localizations.retry),
                    ),
                  ],
                ),
              ),
            );
          }

          if (_feed.isEmpty) {
            return Center(
              child: Text(
                localizations.noStoriesNow,
                style: TextStyle(color: Colors.white70),
              ),
            );
          }

          WidgetsBinding.instance.addPostFrameCallback((_) {
            _prefetchImageIfPossible(_feed, 1);
          });

          return Stack(
            children: [
              RefreshIndicator(
                onRefresh: _onRefresh,
                color: Colors.white,
                backgroundColor: Colors.black,
                child: PageView.builder(
                  key: const ValueKey('vertical-feed-pageview'),
                  controller: _pageController,
                  scrollDirection: Axis.vertical,
                  itemCount: _feed.length + (_isLoadingMore ? 1 : 0),
                  onPageChanged: (index) {
                    _prefetchImageIfPossible(_feed, index + 1);
                    _prefetchImageIfPossible(_feed, index + 2);
                    _loadMoreIfNeeded(index);
                  },
                  itemBuilder: (context, index) {
                    if (index >= _feed.length) {
                      return const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      );
                    }

                    final news = _feed[index];
                    return StoryPager(
                      news: news,
                      isBookmarked: _isBookmarked(news),
                      onBookmarkPressed: () => _toggleBookmark(news),
                      onTranslateRequested: _translateNewsItem,
                    );
                  },
                ),
              ),
              SafeArea(
                child: SizedBox(
                  height: 56,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    scrollDirection: Axis.horizontal,
                    itemBuilder: (context, index) {
                      final category = _categories[index];
                      final selected = category == _selectedCategory;
                      return ChoiceChip(
                        label: Text(
                          category == null
                              ? localizations.all
                              : localizations.categoryLabel(category),
                        ),
                        selected: selected,
                        onSelected: (_) => _onCategorySelected(category),
                        selectedColor: Colors.white,
                        labelStyle: TextStyle(
                          color: selected ? Colors.black : Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                        backgroundColor: Colors.black.withValues(alpha: 0.6),
                        side: const BorderSide(color: Colors.white38),
                      );
                    },
                    separatorBuilder: (context, index) =>
                        const SizedBox(width: 8),
                    itemCount: _categories.length,
                  ),
                ),
              ),
              if (_showingCachedFeed)
                SafeArea(
                  child: Align(
                    alignment: Alignment.topLeft,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 12, top: 64),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: Colors.amber.withValues(alpha: 0.55),
                          ),
                        ),
                        child: Text(
                          _cachedFeedAt == null
                              ? localizations.cachedFeed
                              : localizations.cachedFeedWithTime(
                                  _formatCachedFeedTimestamp(
                                    context,
                                    _cachedFeedAt!,
                                  ),
                                ),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              SafeArea(
                child: Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8, top: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton.filledTonal(
                          onPressed: _openSearchSheet,
                          icon: const Icon(Icons.manage_search),
                          tooltip: localizations.searchSort,
                        ),
                        const SizedBox(width: 8),
                        IconButton.filledTonal(
                          onPressed: _openSettingsSheet,
                          icon: const Icon(Icons.settings_outlined),
                          tooltip: localizations.settings,
                        ),
                        const SizedBox(width: 8),
                        IconButton.filledTonal(
                          onPressed: _isBookmarkSheetLoading
                              ? null
                              : _openBookmarksSheet,
                          icon: _isBookmarkSheetLoading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.bookmarks_outlined),
                          tooltip: localizations.bookmarks,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
