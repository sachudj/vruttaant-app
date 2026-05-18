class NewsItem {
  const NewsItem({
    required this.title,
    required this.summary,
    required this.imageUrl,
    required this.source,
    required this.category,
    this.url,
    this.language,
  });

  final String title;
  final String summary;
  final String imageUrl;
  final String source;
  final String category;
  final String? url;
  final String? language;

  String get originalUrl => (url ?? '').trim();

  factory NewsItem.fromJson(Map<String, dynamic> json) {
    return NewsItem(
      title: (json['title'] as String?)?.trim().isNotEmpty == true
          ? (json['title'] as String).trim()
          : 'Untitled',
      summary: (json['aiSummary'] as String?)?.trim().isNotEmpty == true
          ? (json['aiSummary'] as String).trim()
          : (json['summary'] as String?)?.trim().isNotEmpty == true
          ? (json['summary'] as String).trim()
          : 'No summary available.',
      imageUrl: (json['imageUrl'] as String?)?.trim().isNotEmpty == true
          ? (json['imageUrl'] as String).trim()
          : 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=80',
      source: (json['source'] as String?)?.trim().isNotEmpty == true
          ? (json['source'] as String).trim()
          : 'Unknown Source',
      category: (json['category'] as String?)?.trim().isNotEmpty == true
          ? (json['category'] as String).trim()
          : 'General',
      url: json['url'] as String?,
      language: json['language'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'summary': summary,
      'imageUrl': imageUrl,
      'source': source,
      'category': category,
      'url': url,
      'language': language,
    };
  }
}
