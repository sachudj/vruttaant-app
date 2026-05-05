import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile_app/models/news_item.dart';

class NewsApiService {
  NewsApiService({
    String? baseUrl,
    http.Client? client,
  })  : baseUrl = baseUrl ?? const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:5000'),
        _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Future<List<NewsItem>> ingestAndFetchNews({
    required String sourceUrl,
    String language = 'en',
    int maxItems = 20,
  }) async {
    final uri = Uri.parse('$baseUrl/api/news/ingest');

    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'url': sourceUrl,
        'language': language,
        'maxItems': maxItems,
        'persist': false,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to load news (${response.statusCode}).');
    }

    final dynamic payload = jsonDecode(response.body);
    if (payload is! Map<String, dynamic>) {
      throw Exception('Unexpected API response format.');
    }

    final dynamic cards = payload['cardsPreview'];
    if (cards is! List) {
      throw Exception('No cards found in API response.');
    }

    final items = cards
        .whereType<Map<String, dynamic>>()
        .map(NewsItem.fromJson)
        .toList(growable: false);

    if (items.isEmpty) {
      throw Exception('No news cards were returned from the source.');
    }

    return items;
  }
}
