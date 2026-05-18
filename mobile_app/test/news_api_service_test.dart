import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/news_api_service.dart';

void main() {
  test('fetchNotificationPreferences returns notifications payload', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(
        request.url.toString(),
        'https://api.example.com/api/v1/user/notifications/preferences',
      );
      expect(request.headers['Authorization'], 'Bearer test-token');

      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'notifications': {
              'enabled': true,
              'breakingNews': false,
              'bookmarkAlerts': true,
              'dailyDigest': false,
              'quietHours': {
                'enabled': true,
                'start': '22:00',
                'end': '07:00',
                'timezone': 'UTC',
              },
            },
          },
        }),
        200,
      );
    });

    final service = NewsApiService(
      baseUrl: 'https://api.example.com',
      accessToken: 'test-token',
      client: client,
    );

    final prefs = await service.fetchNotificationPreferences();
    expect(prefs['enabled'], true);
    expect(prefs['breakingNews'], false);
    expect((prefs['quietHours'] as Map<String, dynamic>)['start'], '22:00');
  });

  test('updateNotificationPreferences sends patch payload', () async {
    final client = MockClient((request) async {
      expect(request.method, 'PATCH');
      expect(
        request.url.toString(),
        'https://api.example.com/api/v1/user/notifications/preferences',
      );
      final payload = jsonDecode(request.body) as Map<String, dynamic>;
      final notifications =
          payload['notifications'] as Map<String, dynamic>? ?? {};
      expect(notifications['enabled'], false);
      expect(notifications['dailyDigest'], true);

      return http.Response(
        jsonEncode({
          'success': true,
          'data': {'notifications': notifications},
        }),
        200,
      );
    });

    final service = NewsApiService(
      baseUrl: 'https://api.example.com',
      accessToken: 'test-token',
      client: client,
    );

    final updated = await service.updateNotificationPreferences(
      notifications: {'enabled': false, 'dailyDigest': true},
    );

    expect(updated['enabled'], false);
    expect(updated['dailyDigest'], true);
  });

  test('hasAccessToken uses explicit constructor token', () {
    final service = NewsApiService(
      baseUrl: 'https://api.example.com',
      accessToken: 'explicit-token',
      client: MockClient((_) async => http.Response('{}', 200)),
    );

    expect(service.hasAccessToken, isTrue);
  });

  test('translateStory returns translated content payload', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(
        request.url.toString(),
        'https://api.example.com/api/v1/news/translate',
      );
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      expect(body['targetLanguage'], 'hi');

      return http.Response(
        jsonEncode({
          'translated': true,
          'data': {
            'title': 'अनुवादित शीर्षक',
            'summary': 'अनुवादित सारांश',
            'language': 'hi',
            'fallbackReason': null,
          },
        }),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    });

    final service = NewsApiService(
      baseUrl: 'https://api.example.com',
      client: client,
    );

    final result = await service.translateStory(
      item: const NewsItem(
        title: 'Original title',
        summary: 'Original summary',
        imageUrl: 'https://example.com/image.jpg',
        source: 'Example Source',
        category: 'General',
        language: 'en',
      ),
      targetLanguage: 'hi',
    );

    expect(result.translated, isTrue);
    expect(result.title, 'अनुवादित शीर्षक');
    expect(result.summary, 'अनुवादित सारांश');
    expect(result.language, 'hi');
    expect(result.fallbackReason, isNull);
  });
}
