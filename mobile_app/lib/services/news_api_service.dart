import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile_app/models/bookmark_item.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/auth_service.dart';

class NewsApiService {
  NewsApiService({
    String? baseUrl,
    String? accessToken,
    AuthService? authService,
    http.Client? client,
  }) : baseUrl =
           baseUrl ??
           const String.fromEnvironment(
             'API_BASE_URL',
             defaultValue: 'http://localhost:5000',
           ),
       _staticToken = (() {
         final explicitToken = (accessToken ?? '').trim();
         if (explicitToken.isNotEmpty) return explicitToken;
         final token = const String.fromEnvironment('API_ACCESS_TOKEN').trim();
         return token.isEmpty ? null : token;
       })(),
       _authService = authService,
       _client = client ?? http.Client();

  final String baseUrl;

  /// Static token (from constructor / --dart-define). Used only when no
  /// [AuthService] is provided (e.g. in tests).
  final String? _staticToken;

  final AuthService? _authService;
  final http.Client _client;

  /// Back-compat getter for [PushNotificationService].
  String? get accessToken => _staticToken ?? _authService?.rawAccessToken;

  bool get hasAccessToken {
    if (_authService != null) return _authService.isLoggedIn;
    return (_staticToken ?? '').isNotEmpty;
  }

  // ---------------------------------------------------------------------------
  // Auth header helpers
  // ---------------------------------------------------------------------------

  /// Returns auth headers with a valid (possibly refreshed) access token.
  Future<Map<String, String>> _getAuthHeaders() async {
    String? token;
    if (_authService != null) {
      token = await _authService.getValidAccessToken();
    } else {
      token = _staticToken;
    }

    if (token == null || token.isEmpty) {
      throw Exception('Not authenticated. Please sign in to continue.');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  /// Runs [fn] with auth headers, retrying once with a fresh token on 401.
  Future<http.Response> _authRequest(
    Future<http.Response> Function(Map<String, String> headers) fn,
  ) async {
    final headers = await _getAuthHeaders();
    final response = await fn(headers);

    if (response.statusCode == 401 && _authService != null) {
      final refreshed = await _authService.refreshTokens();
      if (refreshed) {
        final freshHeaders = await _getAuthHeaders();
        return fn(freshHeaders);
      }
    }

    return response;
  }

  // ---------------------------------------------------------------------------
  // News
  // ---------------------------------------------------------------------------

  Future<void> ingestNews({
    required String sourceUrl,
    String language = 'en',
    int maxItems = 20,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/news/ingest');
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

    final trimmedQ = (q ?? '').trim();
    if (trimmedQ.isNotEmpty) {
      query['q'] = trimmedQ;
    }

    final normalizedSort = sort.trim().toLowerCase();
    if (normalizedSort.isNotEmpty) {
      query['sort'] = normalizedSort;
    }

    final uri = Uri.parse(
      '$baseUrl/api/v1/news/cards',
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

    return cards
        .whereType<Map<String, dynamic>>()
        .map(NewsItem.fromJson)
        .toList(growable: false);
  }

  // ---------------------------------------------------------------------------
  // Bookmarks
  // ---------------------------------------------------------------------------

  Future<bool> addBookmark(NewsItem item) async {
    final url = item.originalUrl;
    if (url.isEmpty) {
      throw Exception('Cannot bookmark a story without URL.');
    }

    final uri = Uri.parse('$baseUrl/api/v1/user/bookmarks');
    final body = jsonEncode({
      'title': item.title,
      'url': url,
      'summary': item.summary,
      'category': item.category,
      'imageUrl': item.imageUrl,
      'source': item.source,
      'language': item.language ?? 'en',
    });

    final response = await _authRequest(
      (h) => _client.post(uri, headers: h, body: body),
    );

    if (response.statusCode == 201) return true;
    if (response.statusCode == 409) return false;
    throw Exception('Failed to add bookmark (${response.statusCode}).');
  }

  Future<List<BookmarkItem>> fetchBookmarks({
    int page = 1,
    int limit = 100,
  }) async {
    final uri = Uri.parse(
      '$baseUrl/api/v1/user/bookmarks',
    ).replace(queryParameters: {'page': '$page', 'limit': '$limit'});

    final response = await _authRequest((h) => _client.get(uri, headers: h));

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
    final response = await _authRequest((h) => _client.delete(uri, headers: h));

    if (response.statusCode != 200) {
      throw Exception('Failed to delete bookmark (${response.statusCode}).');
    }
  }

  // ---------------------------------------------------------------------------
  // User profile
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> fetchProfile() async {
    final uri = Uri.parse('$baseUrl/api/v1/user/profile');
    final response = await _authRequest((h) => _client.get(uri, headers: h));

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch profile (${response.statusCode}).');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<void> updateProfile({
    String? language,
    List<String>? categories,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/user/profile');
    final prefs = <String, dynamic>{};
    if (language != null) prefs['language'] = language;
    if (categories != null) prefs['categories'] = categories;

    final response = await _authRequest(
      (h) => _client.patch(
        uri,
        headers: h,
        body: jsonEncode({'preferences': prefs}),
      ),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to update profile (${response.statusCode}).');
    }
  }

  // ---------------------------------------------------------------------------
  // Notification preferences
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> fetchNotificationPreferences() async {
    final uri = Uri.parse('$baseUrl/api/v1/user/notifications/preferences');
    final response = await _authRequest((h) => _client.get(uri, headers: h));

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
    final body = jsonEncode({'notifications': notifications});

    final response = await _authRequest(
      (h) => _client.patch(uri, headers: h, body: body),
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

  Future<void> registerNotificationDevice({
    required String token,
    required String platform,
    String? deviceName,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/user/notifications/devices');
    final body = jsonEncode({
      'token': token,
      'platform': platform,
      'deviceName': deviceName,
    });

    final response = await _authRequest(
      (h) => _client.post(uri, headers: h, body: body),
    );

    if (response.statusCode != 201) {
      throw Exception(
        'Failed to register notification device (${response.statusCode}).',
      );
    }
  }

  Future<List<Map<String, dynamic>>> fetchNotificationDevices() async {
    final uri = Uri.parse('$baseUrl/api/v1/user/notifications/devices');
    final response = await _authRequest((h) => _client.get(uri, headers: h));

    if (response.statusCode != 200) {
      throw Exception(
        'Failed to fetch notification devices (${response.statusCode}).',
      );
    }

    final dynamic payload = jsonDecode(response.body);
    if (payload is! Map<String, dynamic>) {
      throw Exception('Unexpected notification devices response format.');
    }

    final dynamic data = payload['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Missing notification devices data in response.');
    }

    final dynamic devices = data['devices'];
    if (devices is! List) {
      throw Exception('Missing devices list in response.');
    }

    return devices.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<void> deleteNotificationDevice(String deviceId) async {
    final trimmedId = deviceId.trim();
    if (trimmedId.isEmpty) {
      throw Exception('Device id is required.');
    }

    final uri = Uri.parse(
      '$baseUrl/api/v1/user/notifications/devices/$trimmedId',
    );
    final response = await _authRequest((h) => _client.delete(uri, headers: h));

    if (response.statusCode != 200) {
      throw Exception(
        'Failed to delete notification device (${response.statusCode}).',
      );
    }
  }
}
