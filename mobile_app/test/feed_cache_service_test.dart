import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/feed_cache_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('saveFeed and loadFeed returns cached items within max age', () async {
    final service = FeedCacheService();
    final cacheKey = service.buildCacheKey(language: 'en');

    await service.saveFeed(
      cacheKey: cacheKey,
      savedAt: DateTime.now().subtract(const Duration(minutes: 5)),
      items: const [
        NewsItem(
          title: 'Cached Story',
          summary: 'Cached Summary',
          imageUrl: 'https://example.com/image.jpg',
          source: 'Cache Source',
          category: 'General',
          language: 'en',
        ),
      ],
    );

    final snapshot = await service.loadFeed(
      cacheKey: cacheKey,
      maxAge: const Duration(minutes: 30),
    );

    expect(snapshot, isNotNull);
    expect(snapshot!.items, hasLength(1));
    expect(snapshot.items.first.title, 'Cached Story');
  });

  test('loadFeed returns null when cache is expired', () async {
    final service = FeedCacheService();
    final cacheKey = service.buildCacheKey(language: 'en');

    await service.saveFeed(
      cacheKey: cacheKey,
      savedAt: DateTime.now().subtract(const Duration(hours: 2)),
      items: const [
        NewsItem(
          title: 'Old Story',
          summary: 'Old summary',
          imageUrl: 'https://example.com/image.jpg',
          source: 'Cache Source',
          category: 'General',
          language: 'en',
        ),
      ],
    );

    final snapshot = await service.loadFeed(
      cacheKey: cacheKey,
      maxAge: const Duration(minutes: 30),
    );

    expect(snapshot, isNull);
  });

  test('loadFeed returns null for malformed payload', () async {
    final service = FeedCacheService();
    final cacheKey = service.buildCacheKey(language: 'en');
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(service.storageKeyFor(cacheKey), '{invalid-json');

    final snapshot = await service.loadFeed(
      cacheKey: cacheKey,
      maxAge: const Duration(minutes: 30),
    );

    expect(snapshot, isNull);
  });

  test('clearFeed removes cached payload', () async {
    final service = FeedCacheService();
    final cacheKey = service.buildCacheKey(language: 'en');
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(
      service.storageKeyFor(cacheKey),
      jsonEncode({'savedAt': DateTime.now().toIso8601String(), 'items': []}),
    );

    await service.clearFeed(cacheKey);

    expect(prefs.getString(service.storageKeyFor(cacheKey)), isNull);
  });
}
