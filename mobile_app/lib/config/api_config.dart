import 'package:flutter/foundation.dart';

class ApiConfig {
  static const String _definedBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static String resolveBaseUrl() {
    if (_definedBaseUrl.trim().isNotEmpty) {
      return _definedBaseUrl.trim();
    }

    return kReleaseMode ? 'https://api.vruttaant.app' : 'http://localhost:5000';
  }
}
