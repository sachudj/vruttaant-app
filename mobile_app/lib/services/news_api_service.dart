import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile_app/models/news_item.dart';

class NewsApiService {
  NewsApiService({String? baseUrl, http.Client? client})
    : baseUrl =
          baseUrl ??
          const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'http://localhost:5000',
          ),
      _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Future<void> ingestNews({
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
        'persist': true,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to load news (${response.statusCode}).');
    }
  }

  Future<List<NewsItem>> fetchCards({
    String language = 'en',
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    final query = <String, String>{
      'language': language,
      'page': '$page',
      'limit': '$limit',
    };

    if ((category ?? '').trim().isNotEmpty) {
      query['category'] = category!.trim();
    }

    final uri = Uri.parse(
      '$baseUrl/api/news/cards',
    ).replace(queryParameters: query);
    final response = await _client.get(uri);

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch cards (${response.statusCode}).');
    }

    final dynamic payload = jsonDecode(response.body);
    if (payload is! Map<String, dynamic>) {
      throw Exception('Unexpected cards response format.');
    }

    final dynamic cards = payload['cards'];
    if (cards is! List) {
      throw Exception('No cards found in cards response.');
    }

    final items = cards
        .whereType<Map<String, dynamic>>()
        .map(NewsItem.fromJson)
        .toList(growable: false);

    return items;
  }
}
