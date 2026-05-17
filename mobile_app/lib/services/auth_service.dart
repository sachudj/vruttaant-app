import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Manages login, logout, token storage, and silent refresh.
///
/// Tokens are persisted in [SharedPreferences] so they survive app restarts.
/// Access tokens are silently refreshed when they are within [_refreshBufferMs]
/// of their expiry, or when a 401 is received from the server.
class AuthService {
  static const _keyAccessToken = 'auth_access_token';
  static const _keyRefreshToken = 'auth_refresh_token';
  static const _keyUserEmail = 'auth_user_email';
  static const _keyUserId = 'auth_user_id';

  /// Refresh the access token if it expires within the next 60 seconds.
  static const _refreshBufferMs = 60 * 1000;

  final String baseUrl;
  final http.Client _client;

  String? _accessToken;
  String? _refreshToken;
  String? _userEmail;
  String? _userId;

  AuthService({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  bool get isLoggedIn => _accessToken != null && _accessToken!.isNotEmpty;
  String? get userEmail => _userEmail;
  String? get userId => _userId;
  String? get rawAccessToken => _accessToken;

  // ---------------------------------------------------------------------------
  // Initialisation: restore tokens from storage
  // ---------------------------------------------------------------------------

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString(_keyAccessToken);
    _refreshToken = prefs.getString(_keyRefreshToken);
    _userEmail = prefs.getString(_keyUserEmail);
    _userId = prefs.getString(_keyUserId);
  }

  // ---------------------------------------------------------------------------
  // Token access with proactive refresh
  // ---------------------------------------------------------------------------

  /// Returns a valid access token, silently refreshing if needed.
  /// Returns [null] if not logged in or if refresh fails (session expired).
  Future<String?> getValidAccessToken() async {
    if (_accessToken == null) return null;

    if (_isTokenExpiredOrExpiringSoon(_accessToken!)) {
      final ok = await _tryRefresh();
      if (!ok) return null;
    }

    return _accessToken;
  }

  // ---------------------------------------------------------------------------
  // Login / logout
  // ---------------------------------------------------------------------------

  Future<AuthResult> login(String email, String password) async {
    final uri = Uri.parse('$baseUrl/api/v1/auth/login');
    try {
      final response = await _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim(), 'password': password}),
      );

      final body = _decodeBody(response);

      if (response.statusCode == 200 && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>?;
        final tokens = data?['tokens'] as Map<String, dynamic>?;
        final user = data?['user'] as Map<String, dynamic>?;

        final accessToken = tokens?['accessToken'] as String?;
        final refreshToken = tokens?['refreshToken'] as String?;
        final userEmail = user?['email'] as String?;
        final userId = user?['id'] as String?;

        if (accessToken == null || refreshToken == null) {
          return AuthResult.failure('Unexpected response from server.');
        }

        await _storeTokens(
          accessToken: accessToken,
          refreshToken: refreshToken,
          userEmail: userEmail,
          userId: userId,
        );
        return AuthResult.success();
      }

      final message = _extractErrorMessage(body) ?? 'Login failed.';
      return AuthResult.failure(message);
    } catch (e) {
      return AuthResult.failure('Network error: $e');
    }
  }

  Future<void> logout() async {
    // Best-effort server-side revocation (non-blocking).
    if (_refreshToken != null) {
      try {
        final uri = Uri.parse('$baseUrl/api/v1/auth/logout');
        await _client
            .post(
              uri,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({'refreshToken': _refreshToken}),
            )
            .timeout(const Duration(seconds: 5));
      } catch (_) {
        // Ignore — local tokens are cleared regardless.
      }
    }
    await _clearTokens();
  }

  // ---------------------------------------------------------------------------
  // Token refresh (also called externally by NewsApiService on 401)

  /// Attempts a token refresh. Returns [true] on success.
  Future<bool> refreshTokens() => _tryRefresh();

  // Internal helpers
  // ---------------------------------------------------------------------------

  /// Returns [true] if the access token was refreshed successfully.
  Future<bool> _tryRefresh() async {
    final rt = _refreshToken;
    if (rt == null) return false;

    final uri = Uri.parse('$baseUrl/api/v1/auth/refresh');
    try {
      final response = await _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': rt}),
      );

      final body = _decodeBody(response);

      if (response.statusCode == 200 && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>?;
        final tokens = data?['tokens'] as Map<String, dynamic>?;
        final newAccess = tokens?['accessToken'] as String?;
        final newRefresh = tokens?['refreshToken'] as String?;

        if (newAccess == null) return false;

        await _storeTokens(
          accessToken: newAccess,
          refreshToken: newRefresh ?? rt,
          userEmail: _userEmail,
          userId: _userId,
        );
        return true;
      }

      // 401 on refresh = session fully expired; clear local state.
      await _clearTokens();
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> _storeTokens({
    required String accessToken,
    required String refreshToken,
    String? userEmail,
    String? userId,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _userEmail = userEmail;
    _userId = userId;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAccessToken, accessToken);
    await prefs.setString(_keyRefreshToken, refreshToken);
    if (userEmail != null) await prefs.setString(_keyUserEmail, userEmail);
    if (userId != null) await prefs.setString(_keyUserId, userId);
  }

  Future<void> _clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    _userEmail = null;
    _userId = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
    await prefs.remove(_keyUserEmail);
    await prefs.remove(_keyUserId);
  }

  /// Decode the JWT payload (no signature verification — just for the exp claim).
  static Map<String, dynamic>? _decodeJwtPayload(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final normalized = base64Url.normalize(parts[1]);
      final decoded = utf8.decode(base64Url.decode(normalized));
      return jsonDecode(decoded) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static bool _isTokenExpiredOrExpiringSoon(String token) {
    final payload = _decodeJwtPayload(token);
    if (payload == null) return true;
    final exp = payload['exp'];
    if (exp is! int) return true;
    final expiryMs = exp * 1000;
    return DateTime.now().millisecondsSinceEpoch >= expiryMs - _refreshBufferMs;
  }

  static Map<String, dynamic> _decodeBody(http.Response response) {
    try {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  static String? _extractErrorMessage(Map<String, dynamic> body) {
    final error = body['error'];
    if (error is Map<String, dynamic>) {
      return error['message'] as String?;
    }
    return body['message'] as String?;
  }
}

/// Result of a login attempt.
class AuthResult {
  final bool success;
  final String? errorMessage;

  const AuthResult._({required this.success, this.errorMessage});

  factory AuthResult.success() => const AuthResult._(success: true);
  factory AuthResult.failure(String message) =>
      AuthResult._(success: false, errorMessage: message);
}
