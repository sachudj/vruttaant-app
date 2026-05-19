import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile_app/l10n/app_localizations.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/news_api_service.dart';
import 'package:mobile_app/widgets/news_card.dart';
import 'package:share_plus/share_plus.dart';
import 'package:webview_flutter/webview_flutter.dart';

class StoryPager extends StatefulWidget {
  const StoryPager({
    super.key,
    required this.news,
    required this.isBookmarked,
    required this.onBookmarkPressed,
    required this.onTranslateRequested,
    required this.onShareRequested,
  });

  final NewsItem news;
  final bool isBookmarked;
  final VoidCallback onBookmarkPressed;
  final Future<StoryTranslationResult> Function(NewsItem news)
  onTranslateRequested;
  final Future<void> Function(NewsItem news) onShareRequested;

  @override
  State<StoryPager> createState() => _StoryPagerState();
}

class _StoryPagerState extends State<StoryPager> {
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
          readingTime: widget.news.readingTime,
          isBookmarked: widget.isBookmarked,
          onBookmarkPressed: widget.onBookmarkPressed,
          onSharePressed: _shareStory,
          isTranslated: _isTranslated,
          isTranslating: _isTranslating,
          onTranslatePressed: _toggleTranslation,
          translationErrorLabel: _translationError,
          translateTooltip: localizations.translate,
          showOriginalTooltip: localizations.showOriginal,
          addBookmarkTooltip: localizations.addBookmark,
          removeBookmarkTooltip: localizations.removeBookmark,
          shareTooltip: localizations.share,
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

  Future<void> _shareStory() async {
    final url = widget.news.originalUrl;
    final text = url.isNotEmpty
        ? '${widget.news.title}\n\n$url'
        : '${widget.news.title}\n\n${widget.news.summary}';

    await Share.share(text);
    await widget.onShareRequested(widget.news);
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
