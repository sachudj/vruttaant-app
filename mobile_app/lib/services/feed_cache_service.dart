import 'dart:convert';

import 'package:mobile_app/models/news_item.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FeedCacheSnapshot {
  const FeedCacheSnapshot({required this.items, required this.savedAt});

  final List<NewsItem> items;
  final DateTime savedAt;
}

class FeedCacheService {
  static const String _storagePrefix = 'feed_cache_v1::';

  String storageKeyFor(String cacheKey) => '$_storagePrefix$cacheKey';

  String buildCacheKey({
    required String language,
    String? category,
    String? query,
    String sort = 'latest',
  }) {
    final normalizedLanguage = language.trim().toLowerCase();
    final normalizedCategory = (category ?? '').trim().toLowerCase();
    final normalizedQuery = (query ?? '').trim().toLowerCase();
    final normalizedSort = sort.trim().toLowerCase();

    return [
      normalizedLanguage,
      normalizedCategory.isEmpty ? 'all' : normalizedCategory,
      normalizedQuery.isEmpty ? 'none' : normalizedQuery,
      normalizedSort.isEmpty ? 'latest' : normalizedSort,
    ].join('::');
  }

  Future<void> saveFeed({
    required String cacheKey,
    required List<NewsItem> items,
    DateTime? savedAt,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final payload = {
      'savedAt': (savedAt ?? DateTime.now()).toUtc().toIso8601String(),
      'items': items.map((item) => item.toJson()).toList(growable: false),
    };

    await prefs.setString(storageKeyFor(cacheKey), jsonEncode(payload));
  }

  Future<FeedCacheSnapshot?> loadFeed({
    required String cacheKey,
    required Duration maxAge,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(storageKeyFor(cacheKey));
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      final savedAtRaw = decoded['savedAt'] as String?;
      final parsedSavedAt = savedAtRaw == null
          ? null
          : DateTime.tryParse(savedAtRaw);
      if (parsedSavedAt == null) {
        return null;
      }

      final age = DateTime.now().toUtc().difference(parsedSavedAt.toUtc());
      if (age > maxAge) {
        return null;
      }

      final itemsRaw = decoded['items'];
      if (itemsRaw is! List) {
        return null;
      }

      final items = itemsRaw
          .whereType<Map<String, dynamic>>()
          .map(NewsItem.fromJson)
          .toList(growable: false);

      if (items.isEmpty) {
        return null;
      }

      return FeedCacheSnapshot(items: items, savedAt: parsedSavedAt.toLocal());
    } catch (_) {
      return null;
    }
  }

  Future<void> clearFeed(String cacheKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(storageKeyFor(cacheKey));
  }
}
