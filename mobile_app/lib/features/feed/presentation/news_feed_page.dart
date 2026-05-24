import 'package:flutter/material.dart';
import 'package:mobile_app/features/feed/domain/feed_types.dart';
import 'package:mobile_app/features/feed/presentation/sheets/bookmarks_sheet.dart';
import 'package:mobile_app/features/feed/presentation/sheets/login_sheet.dart';
import 'package:mobile_app/features/feed/presentation/sheets/search_sort_sheet.dart';
import 'package:mobile_app/features/feed/presentation/widgets/feed_overlays.dart';
import 'package:mobile_app/features/reader/presentation/story_pager.dart';
import 'package:mobile_app/features/settings/presentation/settings_profile_page.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/models/bookmark_item.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/auth_service.dart';
import 'package:mobile_app/services/event_tracking_service.dart';
import 'package:mobile_app/services/feed_cache_service.dart';
import 'package:mobile_app/services/news_api_service.dart';
import 'package:mobile_app/services/push_notification_service.dart';

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
  int _activeFeedIndex = 0;
  DateTime? _activeFeedStartedAt;
  String? _errorMessage;
  int _currentPage = 1;
  String _language = 'en';
  List<String> _preferredCategories = <String>[];
  String? _selectedCategory;
  String _searchQuery = '';
  String _sort = 'latest';
  late final PushNotificationService _pushService;
  late final EventTrackingService _eventTrackingService;

  @override
  void initState() {
    super.initState();
    _newsApiService = NewsApiService(authService: _authService);
    _eventTrackingService = EventTrackingService(_newsApiService);
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

    return _newsApiService
        .translateStory(item: news, targetLanguage: _language)
        .then((result) {
          if (result.translated) {
            _eventTrackingService.trackTranslate(
              news,
              fromLanguage: (news.language ?? 'en').trim(),
              toLanguage: _language,
            );
          }
          return result;
        });
  }

  Future<void> _shareNewsItem(NewsItem news) async {
    await _eventTrackingService.trackShare(news);
  }

  void _trackViewStartedForIndex(int index) {
    if (index < 0 || index >= _feed.length) return;
    _activeFeedIndex = index;
    _activeFeedStartedAt = DateTime.now();
    _eventTrackingService.trackView(_feed[index]);
  }

  void _trackViewCompletedForIndex(int index) {
    if (index < 0 || index >= _feed.length) return;
    final startedAt = _activeFeedStartedAt;
    final int? durationMs = startedAt == null
        ? null
        : DateTime.now()
              .difference(startedAt)
              .inMilliseconds
              .clamp(0, 3600000)
              .toInt();
    _eventTrackingService.trackView(_feed[index], durationMs: durationMs);
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
        _activeFeedIndex = 0;
        _activeFeedStartedAt = DateTime.now();
        _isInitialLoading = false;
        _showingCachedFeed = true;
        _cachedFeedAt = cachedSnapshot.savedAt;
        _errorMessage = null;
      });
      _trackViewStartedForIndex(0);
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
        _activeFeedIndex = 0;
        _activeFeedStartedAt = DateTime.now();
        _isInitialLoading = false;
        _showingCachedFeed = false;
        _cachedFeedAt = null;
      });
      _trackViewStartedForIndex(0);
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
    final result = await showSearchSortSheet(
      context: context,
      localizations: localizations,
      initialQuery: _searchQuery,
      initialSort: _sort,
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
    await showLoginSheet(
      context: context,
      localizations: localizations,
      authService: _authService,
      onSignedIn: () {
        if (mounted) {
          setState(() {});
        }
      },
      onLoginSuccess: () async {
        await _syncProfileFromServer();
        await _refreshBookmarks();
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
      if (created) {
        _eventTrackingService.trackBookmark(news);
      }
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
      messenger.showSnackBar(
        SnackBar(content: Text(localizations.genericActionFailed)),
      );
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

    final selected = await showBookmarksSheet(
      context: context,
      localizations: localizations,
      bookmarks: _bookmarks,
      onDeleteBookmark: (bookmark) async {
        await _newsApiService.deleteBookmark(bookmark.id);
        if (!mounted) return;
        setState(() {
          _bookmarks.removeWhere((b) => b.id == bookmark.id);
          _bookmarkedUrls.remove(bookmark.url);
        });
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
          onShareRequested: _shareNewsItem,
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
    _trackViewCompletedForIndex(_activeFeedIndex);
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
                    if (index != _activeFeedIndex) {
                      _trackViewCompletedForIndex(_activeFeedIndex);
                      _trackViewStartedForIndex(index);
                    }
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
                      onShareRequested: _shareNewsItem,
                    );
                  },
                ),
              ),
              FeedCategoryChips(
                categories: _categories,
                selectedCategory: _selectedCategory,
                localizations: localizations,
                onCategorySelected: (category) {
                  _onCategorySelected(category);
                },
              ),
              if (_showingCachedFeed)
                FeedCacheBadge(
                  localizations: localizations,
                  cachedAt: _cachedFeedAt,
                  formatCachedTime: (savedAt) {
                    return _formatCachedFeedTimestamp(context, savedAt);
                  },
                ),
              FeedActionButtons(
                localizations: localizations,
                isBookmarkSheetLoading: _isBookmarkSheetLoading,
                onSearchPressed: _openSearchSheet,
                onSettingsPressed: _openSettingsSheet,
                onBookmarksPressed: _openBookmarksSheet,
              ),
            ],
          );
        },
      ),
    );
  }
}
