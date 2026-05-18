import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/models/bookmark_item.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/app_preferences_service.dart';
import 'package:mobile_app/services/auth_service.dart';
import 'package:mobile_app/services/feed_cache_service.dart';
import 'package:mobile_app/services/news_api_service.dart';
import 'package:mobile_app/services/push_notification_service.dart';
import 'package:mobile_app/widgets/news_card.dart';
import 'package:webview_flutter/webview_flutter.dart';

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
        builder: (_) => _SettingsProfilePage(
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
        builder: (_) => _StoryPager(
          news: news,
          isBookmarked: true,
          onBookmarkPressed: () async {},
          onTranslateRequested: _translateNewsItem,
        ),
      ),
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
                    return _StoryPager(
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
                                  '${_cachedFeedAt!.hour.toString().padLeft(2, '0')}:${_cachedFeedAt!.minute.toString().padLeft(2, '0')}',
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

class _StoryPager extends StatefulWidget {
  const _StoryPager({
    required this.news,
    required this.isBookmarked,
    required this.onBookmarkPressed,
    required this.onTranslateRequested,
  });

  final NewsItem news;
  final bool isBookmarked;
  final VoidCallback onBookmarkPressed;
  final Future<StoryTranslationResult> Function(NewsItem news)
  onTranslateRequested;

  @override
  State<_StoryPager> createState() => _StoryPagerState();
}

class _SettingsProfilePage extends StatefulWidget {
  const _SettingsProfilePage({
    required this.authService,
    required this.newsApiService,
    required this.currentLanguage,
    required this.currentCategories,
    required this.defaultNotificationPreferences,
    required this.normalizeNotificationPreferences,
    required this.categoryOptions,
    required this.currentThemeMode,
  });

  final AuthService authService;
  final NewsApiService newsApiService;
  final String currentLanguage;
  final List<String> currentCategories;
  final Map<String, dynamic> defaultNotificationPreferences;
  final Map<String, dynamic> Function(Map<String, dynamic>?)
  normalizeNotificationPreferences;
  final List<String> categoryOptions;
  final ThemeMode currentThemeMode;

  @override
  State<_SettingsProfilePage> createState() => _SettingsProfilePageState();
}

class _SettingsProfilePageState extends State<_SettingsProfilePage> {
  static const List<String> _languageCodes = [
    'en',
    'hi',
    'bn',
    'mr',
    'te',
    'ta',
  ];

  late String _pendingLanguage;
  late Set<String> _pendingCategories;
  late Map<String, dynamic> _pendingNotifications;
  late ThemeMode _pendingThemeMode;

  bool _isLoading = false;
  bool _isSaving = false;
  bool _isLoggedIn = false;
  bool _hasServerNotificationPrefs = false;
  List<Map<String, dynamic>> _devices = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _pendingLanguage = widget.currentLanguage;
    _pendingCategories = widget.currentCategories.toSet();
    _pendingThemeMode = widget.currentThemeMode;
    _pendingNotifications = widget.normalizeNotificationPreferences(
      widget.defaultNotificationPreferences,
    );
    _isLoggedIn = widget.authService.isLoggedIn;

    if (_isLoggedIn) {
      _loadServerData();
    }
  }

  Future<void> _loadServerData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profileData = await widget.newsApiService.fetchProfile();
      final profile = profileData['profile'];
      final prefs = profile is Map<String, dynamic>
          ? profile['preferences'] as Map<String, dynamic>?
          : null;

      var nextLanguage = _pendingLanguage;
      var nextCategories = _pendingCategories;
      if (prefs != null) {
        final profileLang = prefs['language'] as String?;
        if (profileLang != null && profileLang.isNotEmpty) {
          nextLanguage = profileLang;
        }
        final profileCategories = (prefs['categories'] as List?)
            ?.whereType<String>()
            .map((c) => c.trim())
            .where((c) => c.isNotEmpty)
            .toSet();
        if (profileCategories != null) {
          nextCategories = profileCategories;
        }
      }

      Map<String, dynamic> nextNotifications = _pendingNotifications;
      var hasNotificationPrefs = false;
      try {
        final fetched = await widget.newsApiService
            .fetchNotificationPreferences();
        nextNotifications = widget.normalizeNotificationPreferences(fetched);
        hasNotificationPrefs = true;
      } catch (_) {
        nextNotifications = widget.normalizeNotificationPreferences(null);
      }

      List<Map<String, dynamic>> devices = const [];
      try {
        devices = await widget.newsApiService.fetchNotificationDevices();
      } catch (_) {}

      if (!mounted) return;
      setState(() {
        _pendingLanguage = nextLanguage;
        _pendingCategories = nextCategories;
        _pendingNotifications = nextNotifications;
        _hasServerNotificationPrefs = hasNotificationPrefs;
        _devices = devices;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveSettings() async {
    final themeModeCode = switch (_pendingThemeMode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };

    if (!_isLoggedIn) {
      Navigator.of(context).pop({
        'language': _pendingLanguage,
        'categories': _pendingCategories.toList(growable: false),
        'themeMode': themeModeCode,
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      await widget.newsApiService.updateProfile(
        language: _pendingLanguage,
        categories: _pendingCategories.toList(growable: false),
      );

      await widget.newsApiService.updateNotificationPreferences(
        notifications: widget.normalizeNotificationPreferences(
          _pendingNotifications,
        ),
      );

      if (!mounted) return;
      Navigator.of(context).pop({
        'language': _pendingLanguage,
        'categories': _pendingCategories.toList(growable: false),
        'themeMode': themeModeCode,
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _isSaving = false;
      });
    }
  }

  Future<void> _deleteDevice(String id) async {
    try {
      await widget.newsApiService.deleteNotificationDevice(id);
      if (!mounted) return;
      setState(() {
        _devices = _devices
            .where((d) => '${d['id']}' != id)
            .toList(growable: false);
      });
      final localizations = AppLocalizations.of(context);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(localizations.deviceRemoved)));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _logout() async {
    await widget.authService.logout();
    if (!mounted) return;
    Navigator.of(context).pop({'signedOut': true});
  }

  Widget _languageTile(String code, String label) {
    return ListTile(
      title: Text(label, style: const TextStyle(color: Colors.white)),
      trailing: _pendingLanguage == code
          ? const Icon(Icons.check, color: Colors.indigoAccent)
          : null,
      onTap: () {
        setState(() {
          _pendingLanguage = code;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.settings),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveSettings,
            child: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(localizations.save),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.only(bottom: 20),
              children: [
                if (_error != null)
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: Colors.redAccent.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 12, 16, 6),
                  child: Text(
                    localizations.account,
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                if (_isLoggedIn) ...[
                  ListTile(
                    leading: const Icon(
                      Icons.account_circle,
                      color: Colors.white70,
                    ),
                    title: Text(
                      widget.authService.userEmail ??
                          localizations.signedInState,
                      style: const TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      localizations.profileSyncHint,
                      style: TextStyle(color: Colors.white54),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.logout, color: Colors.white70),
                    title: Text(
                      localizations.signOut,
                      style: TextStyle(color: Colors.white),
                    ),
                    onTap: _logout,
                  ),
                ] else ...[
                  ListTile(
                    leading: const Icon(Icons.login, color: Colors.white70),
                    title: Text(
                      localizations.signIn,
                      style: TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      localizations.signInManage,
                      style: TextStyle(color: Colors.white54),
                    ),
                    onTap: () =>
                        Navigator.of(context).pop({'signInRequested': true}),
                  ),
                ],
                const Divider(color: Colors.white24),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Text(
                    localizations.language,
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                ..._languageCodes.map(
                  (code) =>
                      _languageTile(code, localizations.languageLabel(code)),
                ),
                const Divider(color: Colors.white24),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Text(
                    localizations.theme,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: Text(localizations.themeSystem),
                        selected: _pendingThemeMode == ThemeMode.system,
                        onSelected: (_) {
                          setState(() {
                            _pendingThemeMode = ThemeMode.system;
                          });
                        },
                      ),
                      ChoiceChip(
                        label: Text(localizations.themeLight),
                        selected: _pendingThemeMode == ThemeMode.light,
                        onSelected: (_) {
                          setState(() {
                            _pendingThemeMode = ThemeMode.light;
                          });
                        },
                      ),
                      ChoiceChip(
                        label: Text(localizations.themeDark),
                        selected: _pendingThemeMode == ThemeMode.dark,
                        onSelected: (_) {
                          setState(() {
                            _pendingThemeMode = ThemeMode.dark;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                const Divider(color: Colors.white24),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Text(
                    localizations.categoryPreferences,
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: widget.categoryOptions
                        .map((category) {
                          final selected = _pendingCategories.contains(
                            category,
                          );
                          return FilterChip(
                            label: Text(localizations.categoryLabel(category)),
                            selected: selected,
                            onSelected: (value) {
                              setState(() {
                                if (value) {
                                  _pendingCategories.add(category);
                                } else {
                                  _pendingCategories.remove(category);
                                }
                              });
                            },
                          );
                        })
                        .toList(growable: false),
                  ),
                ),
                if (_isLoggedIn) ...[
                  const Divider(color: Colors.white24),
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                    child: Text(
                      localizations.notifications,
                      style: TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  if (!_hasServerNotificationPrefs)
                    Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 4,
                      ),
                      child: Text(
                        localizations.notificationDefaultsHint,
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.enableNotifications,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['enabled'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['enabled'] = value;
                      });
                    },
                  ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.breakingNewsAlerts,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['breakingNews'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['breakingNews'] = value;
                      });
                    },
                  ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.bookmarkAlerts,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['bookmarkAlerts'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['bookmarkAlerts'] = value;
                      });
                    },
                  ),
                  SwitchListTile.adaptive(
                    title: Text(
                      localizations.dailyDigest,
                      style: TextStyle(color: Colors.white),
                    ),
                    value: _pendingNotifications['dailyDigest'] as bool,
                    onChanged: (value) {
                      setState(() {
                        _pendingNotifications['dailyDigest'] = value;
                      });
                    },
                  ),
                  const Divider(color: Colors.white24),
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                    child: Text(
                      localizations.registeredDevices,
                      style: TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  if (_devices.isEmpty)
                    Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      child: Text(
                        localizations.noNotificationDevices,
                        style: TextStyle(color: Colors.white70),
                      ),
                    )
                  else
                    ..._devices.map((device) {
                      final id = '${device['id'] ?? ''}';
                      final platform =
                          '${device['platform'] ?? localizations.unknownPlatform}';
                      final name =
                          '${device['deviceName'] ?? localizations.deviceFallbackName}';
                      return ListTile(
                        leading: const Icon(
                          Icons.phone_android,
                          color: Colors.white70,
                        ),
                        title: Text(
                          name,
                          style: const TextStyle(color: Colors.white),
                        ),
                        subtitle: Text(
                          platform.toUpperCase(),
                          style: const TextStyle(color: Colors.white54),
                        ),
                        trailing: IconButton(
                          onPressed: id.isEmpty
                              ? null
                              : () => _deleteDevice(id),
                          icon: const Icon(
                            Icons.delete_outline,
                            color: Colors.white70,
                          ),
                        ),
                      );
                    }),
                ],
              ],
            ),
    );
  }
}

class _StoryPagerState extends State<_StoryPager> {
  late final bool _isTestBinding;
  late final bool _isWebViewSupported;
  late String _displayTitle;
  late String _displaySummary;
  bool _isTranslated = false;
  bool _isTranslating = false;
  String? _translationError;
  WebViewController? _controller;

  @override
  void initState() {
    super.initState();
    _isTestBinding = WidgetsBinding.instance.runtimeType.toString().contains(
      'TestWidgetsFlutterBinding',
    );
    _isWebViewSupported = !kIsWeb && !_isTestBinding;
    _displayTitle = widget.news.title;
    _displaySummary = widget.news.summary;

    final articleUrl = widget.news.originalUrl;
    if (_isWebViewSupported && articleUrl.isNotEmpty) {
      _controller = WebViewController()..loadRequest(Uri.parse(articleUrl));
    }
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return PageView(
      key: const ValueKey('story-pager-pageview'),
      scrollDirection: Axis.horizontal,
      children: [
        NewsCard(
          title: _displayTitle,
          summary: _displaySummary,
          imageUrl: widget.news.imageUrl,
          source: widget.news.source,
          isBookmarked: widget.isBookmarked,
          onBookmarkPressed: widget.onBookmarkPressed,
          isTranslated: _isTranslated,
          isTranslating: _isTranslating,
          onTranslatePressed: _toggleTranslation,
          translationErrorLabel: _translationError,
          translateTooltip: localizations.translate,
          showOriginalTooltip: localizations.showOriginal,
          addBookmarkTooltip: localizations.addBookmark,
          removeBookmarkTooltip: localizations.removeBookmark,
          statusOriginalLabel: localizations.original,
          statusTranslatedLabel: localizations.translated,
          statusTranslatingLabel: localizations.translating,
        ),
        _buildReaderPage(),
      ],
    );
  }

  Future<void> _toggleTranslation() async {
    if (_isTranslating) {
      return;
    }

    if (_isTranslated) {
      setState(() {
        _displayTitle = widget.news.title;
        _displaySummary = widget.news.summary;
        _isTranslated = false;
        _translationError = null;
      });
      return;
    }

    setState(() {
      _isTranslating = true;
      _translationError = null;
    });

    try {
      final result = await widget.onTranslateRequested(widget.news);
      if (!mounted) return;

      if (result.translated) {
        setState(() {
          _displayTitle = result.title;
          _displaySummary = result.summary;
          _isTranslated = true;
          _isTranslating = false;
          _translationError = null;
        });
        return;
      }

      setState(() {
        _displayTitle = widget.news.title;
        _displaySummary = widget.news.summary;
        _isTranslated = false;
        _isTranslating = false;
        _translationError = AppLocalizations.of(context).translationUnavailable;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            AppLocalizations.of(context).translationUnavailableSnack,
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _displayTitle = widget.news.title;
        _displaySummary = widget.news.summary;
        _isTranslated = false;
        _isTranslating = false;
        _translationError = AppLocalizations.of(context).translationFailed;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context).translationFailedSnack),
        ),
      );
    }
  }

  Widget _buildReaderPage() {
    final localizations = AppLocalizations.of(context);
    final articleUrl = widget.news.originalUrl;
    final controller = _controller;

    final readerBody = _isWebViewSupported && controller != null
        ? WebViewWidget(controller: controller)
        : Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  localizations.readMore,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  localizations.readerHint,
                  style: TextStyle(color: Colors.white70, height: 1.4),
                ),
                const SizedBox(height: 16),
                if (articleUrl.isEmpty)
                  Text(
                    localizations.noOriginalUrl,
                    style: TextStyle(color: Colors.white70),
                  )
                else
                  SelectableText(
                    articleUrl,
                    style: const TextStyle(color: Colors.lightBlueAccent),
                  ),
              ],
            ),
          );

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: _isTranslated
                        ? Colors.teal.withValues(alpha: 0.28)
                        : Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _isTranslating
                        ? localizations.translating
                        : _isTranslated
                        ? localizations.translated
                        : localizations.original,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const Spacer(),
                IconButton.filledTonal(
                  onPressed: _isTranslating ? null : _toggleTranslation,
                  icon: _isTranslating
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(
                          _isTranslated
                              ? Icons.translate_outlined
                              : Icons.g_translate,
                        ),
                  tooltip: _isTranslated
                      ? localizations.showOriginal
                      : localizations.translate,
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              _displayTitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 20,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              _displaySummary,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white70, height: 1.35),
            ),
          ),
          const SizedBox(height: 12),
          const Divider(color: Colors.white24, height: 1),
          Expanded(child: readerBody),
        ],
      ),
    );
  }
}
