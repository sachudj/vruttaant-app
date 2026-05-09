import 'package:mobile_app/models/news_item.dart';

class BookmarkItem {
  const BookmarkItem({
    required this.id,
    required this.title,
    required this.url,
    required this.summary,
    required this.category,
    required this.imageUrl,
    required this.source,
    required this.language,
  });

  final String id;
  final String title;
  final String url;
  final String summary;
  final String category;
  final String imageUrl;
  final String source;
  final String language;

  factory BookmarkItem.fromJson(Map<String, dynamic> json) {
    return BookmarkItem(
      id: (json['id'] as String?)?.trim() ?? '',
      title: (json['title'] as String?)?.trim().isNotEmpty == true
          ? (json['title'] as String).trim()
          : 'Untitled',
      url: (json['url'] as String?)?.trim() ?? '',
      summary: (json['summary'] as String?)?.trim().isNotEmpty == true
          ? (json['summary'] as String).trim()
          : 'No summary available.',
      category: (json['category'] as String?)?.trim().isNotEmpty == true
          ? (json['category'] as String).trim()
          : 'General',
      imageUrl: (json['imageUrl'] as String?)?.trim().isNotEmpty == true
          ? (json['imageUrl'] as String).trim()
          : 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=80',
      source: (json['source'] as String?)?.trim().isNotEmpty == true
          ? (json['source'] as String).trim()
          : 'Unknown Source',
      language: (json['language'] as String?)?.trim().isNotEmpty == true
          ? (json['language'] as String).trim()
          : 'en',
    );
  }

  NewsItem toNewsItem() {
    return NewsItem(
      title: title,
      summary: summary,
      imageUrl: imageUrl,
      source: source,
      category: category,
      url: url,
      language: language,
    );
  }
}
