import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
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
  static const List<String> _sourceUrls = [
    'https://www.bbc.com/news',
    'https://www.reuters.com/world/',
    'https://www.aljazeera.com/news/',
  ];

  final NewsApiService _newsApiService = NewsApiService();
  final PageController _pageController = PageController();
  final List<NewsItem> _feed = [];

  bool _isInitialLoading = true;
  bool _isLoadingMore = false;
  String? _errorMessage;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _loadInitialFeed();
  }

  Future<List<NewsItem>> _fetchNewsPage(int page) {
    final loader = widget.newsLoader;
    if (loader != null) {
      return loader(page);
    }

    final sourceUrl = _sourceUrls[page % _sourceUrls.length];
    return _newsApiService.ingestAndFetchNews(
      sourceUrl: sourceUrl,
      maxItems: 20,
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
      final firstPage = await _fetchNewsPage(0);
      if (!mounted) return;

      setState(() {
        _feed
          ..clear()
          ..addAll(firstPage);
        _currentPage = 0;
        _isInitialLoading = false;
      });
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

    precacheImage(NetworkImage(imageUrl), context).catchError((error, stackTrace) {
      return;
    });
  }

  Future<void> _onRefresh() async {
    await _loadInitialFeed();
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

          return RefreshIndicator(
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
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _StoryPager extends StatefulWidget {
  const _StoryPager({required this.news});

  final NewsItem news;

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
    _isTestBinding = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
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
        ),
        _buildReaderPage(),
      ],
    );
  }

  Widget _buildReaderPage() {
    final articleUrl = widget.news.originalUrl;
    final controller = _controller;

    if (_isWebViewSupported && controller != null) {
      return SafeArea(
        child: WebViewWidget(controller: controller),
      );
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
