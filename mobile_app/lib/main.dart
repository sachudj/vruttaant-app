import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile_app/models/bookmark_item.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/news_api_service.dart';
import 'package:mobile_app/widgets/news_card.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  runApp(const MyApp());
}

typedef NewsLoader = Future<List<NewsItem>> Function(int page);

class MyApp extends StatelessWidget {
  const MyApp({super.key, this.newsLoader});

  final NewsLoader? newsLoader;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vruttaant',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        scaffoldBackgroundColor: Colors.black,
        useMaterial3: true,
      ),
      debugShowCheckedModeBanner: false,
      home: NewsFeedPage(newsLoader: newsLoader),
    );
  }
}

class NewsFeedPage extends StatefulWidget {
  const NewsFeedPage({super.key, this.newsLoader});

  final NewsLoader? newsLoader;

  @override
  State<NewsFeedPage> createState() => _NewsFeedPageState();
}

class _NewsFeedPageState extends State<NewsFeedPage> {
  final NewsApiService _newsApiService = NewsApiService();
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

  bool _isInitialLoading = true;
  bool _isLoadingMore = false;
  bool _isBookmarkSheetLoading = false;
  String? _errorMessage;
  int _currentPage = 1;
  String _language = 'en';
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _loadInitialFeed();
  }

  Future<List<NewsItem>> _fetchNewsPage(int page) {
    final loader = widget.newsLoader;
    if (loader != null) {
      return loader(page - 1);
    }

    return _newsApiService.fetchCards(
      language: _language,
      category: _selectedCategory,
      page: page,
      limit: 20,
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
    setState(() {
      _isInitialLoading = true;
      _errorMessage = null;
    });

    try {
      var firstPage = await _fetchNewsPage(1);

      if (firstPage.isEmpty) {
        throw Exception('No stories available for the selected filters yet.');
      }

      if (!mounted) return;

      setState(() {
        _feed
          ..clear()
          ..addAll(firstPage);
        _currentPage = 1;
        _isInitialLoading = false;
      });
      await _refreshBookmarks();
    } catch (error) {
      if (!mounted) return;
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

      setState(() {
        _feed
          ..clear()
          ..addAll(_mergeUnique(_feed, incoming));
        _currentPage = nextPage;
        _isLoadingMore = false;
      });
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
    final messenger = ScaffoldMessenger.of(context);
    final url = news.originalUrl;

    if (!_newsApiService.hasAccessToken) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Bookmark actions require API_ACCESS_TOKEN. Run with --dart-define=API_ACCESS_TOKEN=<jwt>.',
          ),
        ),
      );
      return;
    }

    if (url.isEmpty) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('This story cannot be bookmarked (missing URL).'),
        ),
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
          const SnackBar(content: Text('Bookmark removed.')),
        );
        return;
      }

      final created = await _newsApiService.addBookmark(news);
      await _refreshBookmarks();
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(created ? 'Bookmarked.' : 'Already bookmarked.'),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _openSettingsSheet() async {
    final selectedLanguage = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFF121212),
      isScrollControlled: true,
      builder: (context) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: Column(
              children: [
                const SizedBox(height: 10),
                const Text(
                  'Language Preference',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 8),
                const Divider(color: Colors.white24, height: 1),
                Expanded(
                  child: ListView(
                    children: [
                      _buildLanguageTile(context, 'en', 'English'),
                      _buildLanguageTile(context, 'hi', 'Hindi'),
                      _buildLanguageTile(context, 'bn', 'Bengali'),
                      _buildLanguageTile(context, 'mr', 'Marathi'),
                      _buildLanguageTile(context, 'te', 'Telugu'),
                      _buildLanguageTile(context, 'ta', 'Tamil'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (selectedLanguage != null && selectedLanguage != _language) {
      if (!mounted) return;
      setState(() {
        _language = selectedLanguage;
        // Optionally clear bookmarks since they might be language specific,
        // but for now, we'll keep them as is and just reload the feed.
      });
      await _loadInitialFeed();
    }
  }

  Widget _buildLanguageTile(BuildContext context, String code, String name) {
    return ListTile(
      title: Text(name, style: const TextStyle(color: Colors.white)),
      trailing: _language == code
          ? const Icon(Icons.check, color: Colors.indigoAccent)
          : null,
      onTap: () => Navigator.of(context).pop(code),
    );
  }

  Future<void> _openBookmarksSheet() async {
    if (!_newsApiService.hasAccessToken) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Bookmark list requires API_ACCESS_TOKEN. Run with --dart-define=API_ACCESS_TOKEN=<jwt>.',
          ),
        ),
      );
      return;
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
                const Text(
                  'Bookmarks',
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
                      ? const Center(
                          child: Text(
                            'No bookmarks yet.',
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
                                    const SnackBar(
                                      content: Text('Bookmark removed.'),
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
                    const Text(
                      'Could not load news feed',
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
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (_feed.isEmpty) {
            return const Center(
              child: Text(
                'No stories available right now.',
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
                        label: Text(category ?? 'All'),
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
              SafeArea(
                child: Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8, top: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton.filledTonal(
                          onPressed: _openSettingsSheet,
                          icon: const Icon(Icons.language),
                          tooltip: 'Language Preferences',
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
                          tooltip: 'Bookmarks',
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
  });

  final NewsItem news;
  final bool isBookmarked;
  final VoidCallback onBookmarkPressed;

  @override
  State<_StoryPager> createState() => _StoryPagerState();
}

class _StoryPagerState extends State<_StoryPager> {
  late final bool _isTestBinding;
  late final bool _isWebViewSupported;
  WebViewController? _controller;

  @override
  void initState() {
    super.initState();
    _isTestBinding = WidgetsBinding.instance.runtimeType.toString().contains(
      'TestWidgetsFlutterBinding',
    );
    _isWebViewSupported = !kIsWeb && !_isTestBinding;

    final articleUrl = widget.news.originalUrl;
    if (_isWebViewSupported && articleUrl.isNotEmpty) {
      _controller = WebViewController()..loadRequest(Uri.parse(articleUrl));
    }
  }

  @override
  Widget build(BuildContext context) {
    return PageView(
      scrollDirection: Axis.horizontal,
      children: [
        NewsCard(
          title: widget.news.title,
          summary: widget.news.summary,
          imageUrl: widget.news.imageUrl,
          source: widget.news.source,
          isBookmarked: widget.isBookmarked,
          onBookmarkPressed: widget.onBookmarkPressed,
        ),
        _buildReaderPage(),
      ],
    );
  }

  Widget _buildReaderPage() {
    final articleUrl = widget.news.originalUrl;
    final controller = _controller;

    if (_isWebViewSupported && controller != null) {
      return SafeArea(child: WebViewWidget(controller: controller));
    }

    if (articleUrl.isEmpty) {
      return const Center(
        child: Text(
          'No original article URL available.',
          style: TextStyle(color: Colors.white70),
        ),
      );
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Read More',
              style: TextStyle(
                color: Colors.white,
                fontSize: 26,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Swipe left from the news card to open the full article in supported mobile platforms.',
              style: TextStyle(color: Colors.white70, height: 1.4),
            ),
            const SizedBox(height: 16),
            SelectableText(
              articleUrl,
              style: const TextStyle(color: Colors.lightBlueAccent),
            ),
          ],
        ),
      ),
    );
  }
}
