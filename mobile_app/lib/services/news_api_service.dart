import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile_app/models/bookmark_item.dart';
import 'package:mobile_app/models/news_item.dart';

class NewsApiService {
  NewsApiService({String? baseUrl, String? accessToken, http.Client? client})
    : baseUrl =
          baseUrl ??
          const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'http://localhost:5000',
          ),
      accessToken = (() {
        final explicitToken = (accessToken ?? '').trim();
        if (explicitToken.isNotEmpty) {
          return explicitToken;
        }
        final token = const String.fromEnvironment('API_ACCESS_TOKEN').trim();
        return token.isEmpty ? null : token;
      })(),
      _client = client ?? http.Client();

  final String baseUrl;
  final String? accessToken;
  final http.Client _client;

  bool get hasAccessToken => (accessToken ?? '').isNotEmpty;

  Map<String, String> _authHeaders() {
    if (!hasAccessToken) {
      throw Exception(
        'API_ACCESS_TOKEN is required for bookmark operations. '
        'Run flutter with --dart-define=API_ACCESS_TOKEN=<jwt>.',
      );
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    };
  }

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
    String? q,
    String sort = 'latest',
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

    final trimmedQuery = (q ?? '').trim();
    if (trimmedQuery.isNotEmpty) {
      query['q'] = trimmedQuery;
    }

    final normalizedSort = sort.trim().toLowerCase();
    if (normalizedSort.isNotEmpty) {
      query['sort'] = normalizedSort;
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

  Future<bool> addBookmark(NewsItem item) async {
    final url = item.originalUrl;
    if (url.isEmpty) {
      throw Exception('Cannot bookmark a story without URL.');
    }

    final uri = Uri.parse('$baseUrl/api/v1/user/bookmarks');
    final response = await _client.post(
      uri,
      headers: _authHeaders(),
      body: jsonEncode({
        'title': item.title,
        'url': url,
        'summary': item.summary,
        'category': item.category,
        'imageUrl': item.imageUrl,
        'source': item.source,
        'language': item.language ?? 'en',
      }),
    );

    if (response.statusCode == 201) {
      return true;
    }

    if (response.statusCode == 409) {
      return false;
    }

    throw Exception('Failed to add bookmark (${response.statusCode}).');
  }

  Future<List<BookmarkItem>> fetchBookmarks({
    int page = 1,
    int limit = 100,
  }) async {
    final uri = Uri.parse(
      '$baseUrl/api/v1/user/bookmarks',
    ).replace(queryParameters: {'page': '$page', 'limit': '$limit'});

    final response = await _client.get(uri, headers: _authHeaders());
    if (response.statusCode != 200) {
      throw Exception('Failed to fetch bookmarks (${response.statusCode}).');
    }

    final dynamic payload = jsonDecode(response.body);
    if (payload is! Map<String, dynamic>) {
      throw Exception('Unexpected bookmarks response format.');
    }

    final data = payload['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Missing bookmarks data in response.');
    }

    final dynamic bookmarks = data['bookmarks'];
    if (bookmarks is! List) {
      throw Exception('No bookmarks list found in response.');
    }

    return bookmarks
        .whereType<Map<String, dynamic>>()
        .map(BookmarkItem.fromJson)
        .toList(growable: false);
  }

  Future<void> deleteBookmark(String id) async {
    final bookmarkId = id.trim();
    if (bookmarkId.isEmpty) {
      throw Exception('Bookmark id is required.');
    }

    final uri = Uri.parse('$baseUrl/api/v1/user/bookmarks/$bookmarkId');
    final response = await _client.delete(uri, headers: _authHeaders());
    if (response.statusCode != 200) {
      throw Exception('Failed to delete bookmark (${response.statusCode}).');
    }
  }

  Future<Map<String, dynamic>> fetchProfile() async {
    final uri = Uri.parse('$baseUrl/api/v1/user/profile');
    final response = await _client.get(uri, headers: _authHeaders());
    if (response.statusCode != 200) {
      throw Exception('Failed to fetch profile (${response.statusCode}).');
    }
    final dynamic payload = jsonDecode(response.body);
    return payload as Map<String, dynamic>;
  }

  Future<void> updateProfile({String? language}) async {
    final uri = Uri.parse('$baseUrl/api/v1/user/profile');

    final prefs = <String, dynamic>{};
    if (language != null) {
      prefs['language'] = language;
    }

    final response = await _client.patch(
      uri,
      headers: _authHeaders(),
      body: jsonEncode({'preferences': prefs}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to update profile (${response.statusCode}).');
    }
  }

  Future<Map<String, dynamic>> fetchNotificationPreferences() async {
    final uri = Uri.parse('$baseUrl/api/v1/user/notifications/preferences');
    final response = await _client.get(uri, headers: _authHeaders());
    if (response.statusCode != 200) {
      throw Exception(
        'Failed to fetch notification preferences (${response.statusCode}).',
      );
    }

    final dynamic payload = jsonDecode(response.body);
    if (payload is! Map<String, dynamic>) {
      throw Exception('Unexpected notification preferences response format.');
    }

    final dynamic data = payload['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Missing notification preferences data in response.');
    }

    final dynamic notifications = data['notifications'];
    if (notifications is! Map<String, dynamic>) {
      throw Exception('Missing notifications object in response.');
    }

    return notifications;
  }

  Future<Map<String, dynamic>> updateNotificationPreferences({
    required Map<String, dynamic> notifications,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/user/notifications/preferences');
    final response = await _client.patch(
      uri,
      headers: _authHeaders(),
      body: jsonEncode({'notifications': notifications}),
    );

    if (response.statusCode != 200) {
      throw Exception(
        'Failed to update notification preferences (${response.statusCode}).',
      );
    }

    final dynamic payload = jsonDecode(response.body);
    if (payload is! Map<String, dynamic>) {
      throw Exception('Unexpected notification preferences update format.');
    }

    final dynamic data = payload['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Missing notification update data in response.');
    }

    final dynamic updated = data['notifications'];
    if (updated is! Map<String, dynamic>) {
      throw Exception('Missing updated notifications in response.');
    }

    return updated;
  }
}
