import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:mobile_app/models/news_item.dart';
import 'package:mobile_app/services/news_api_service.dart';

class EventTrackingService {
  EventTrackingService(this._newsApiService)
    : _sessionId =
          '${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(1000000)}';

  final NewsApiService _newsApiService;
  final String _sessionId;

  static final RegExp _objectIdRegExp = RegExp(r'^[0-9a-fA-F]{24}$');

  Future<void> trackView(NewsItem item, {int? durationMs}) async {
    await _submit(item: item, eventType: 'view', durationMs: durationMs);
  }

  Future<void> trackBookmark(NewsItem item) async {
    await _submit(item: item, eventType: 'bookmark');
  }

  Future<void> trackTranslate(
    NewsItem item, {
    required String fromLanguage,
    required String toLanguage,
  }) async {
    await _submit(
      item: item,
      eventType: 'translate',
      translation: {
        'fromLanguage': fromLanguage.trim().isEmpty
            ? 'en'
            : fromLanguage.trim(),
        'toLanguage': toLanguage.trim().isEmpty ? 'en' : toLanguage.trim(),
      },
    );
  }

  Future<void> trackShare(NewsItem item) async {
    await _submit(item: item, eventType: 'share');
  }

  Future<void> _submit({
    required NewsItem item,
    required String eventType,
    int? durationMs,
    Map<String, dynamic>? translation,
  }) async {
    final cardId = item.analyticsCardId;
    if (!_objectIdRegExp.hasMatch(cardId)) {
      return;
    }

    final payload = {
      'sessionId': _sessionId,
      'deviceType': _deviceType(),
      'platform': _platform(),
      if ((item.language ?? '').trim().isNotEmpty)
        'appLanguage': item.language!.trim(),
    };

    try {
      await _newsApiService.submitAnalyticsEvent(
        eventType: eventType,
        newsCardId: cardId,
        duration: durationMs,
        translation: translation,
        deviceMetadata: payload,
      );
    } catch (_) {
      // Non-blocking analytics: never break user actions on tracking failures.
    }
  }

  String _platform() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.android:
        return 'android';
      default:
        return 'web';
    }
  }

  String _deviceType() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
      case TargetPlatform.android:
        return 'mobile';
      default:
        return 'tablet';
    }
  }
}
