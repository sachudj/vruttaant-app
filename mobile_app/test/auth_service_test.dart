import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('loginWithSocialToken stores returned tokens', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(
        request.url.toString(),
        'https://api.example.com/api/v1/auth/social',
      );

      final payload = jsonDecode(request.body) as Map<String, dynamic>;
      expect(payload['provider'], 'google');
      expect(payload['idToken'], 'google-id-token');

      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'user': {
              'id': 'uid-1',
              'email': 'social@example.com',
              'role': 'user',
            },
            'tokens': {
              'accessToken': 'access-token',
              'refreshToken': 'refresh-token',
            },
          },
        }),
        200,
      );
    });

    final service = AuthService(
      baseUrl: 'https://api.example.com',
      client: client,
    );

    final result = await service.loginWithSocialToken(
      provider: 'google',
      idToken: 'google-id-token',
    );

    expect(result.success, isTrue);
    expect(service.isLoggedIn, isTrue);
    expect(service.rawAccessToken, 'access-token');
    expect(service.userEmail, 'social@example.com');
  });

  test(
    'loginWithSocialToken returns backend error message on failure',
    () async {
      final client = MockClient((_) async {
        return http.Response(
          jsonEncode({
            'success': false,
            'error': {'message': 'Invalid Google id token.'},
          }),
          401,
        );
      });

      final service = AuthService(
        baseUrl: 'https://api.example.com',
        client: client,
      );

      final result = await service.loginWithSocialToken(
        provider: 'google',
        idToken: 'bad-token',
      );

      expect(result.success, isFalse);
      expect(result.errorMessage, 'Invalid Google id token.');
    },
  );

  test('loginWithSocialToken sends nonce for apple provider', () async {
    final client = MockClient((request) async {
      final payload = jsonDecode(request.body) as Map<String, dynamic>;
      expect(payload['provider'], 'apple');
      expect(payload['idToken'], 'apple-id-token');
      expect(payload['nonce'], 'apple-nonce');

      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'user': {
              'id': 'uid-2',
              'email': 'apple@example.com',
              'role': 'user',
            },
            'tokens': {
              'accessToken': 'apple-access-token',
              'refreshToken': 'apple-refresh-token',
            },
          },
        }),
        200,
      );
    });

    final service = AuthService(
      baseUrl: 'https://api.example.com',
      client: client,
    );

    final result = await service.loginWithSocialToken(
      provider: 'apple',
      idToken: 'apple-id-token',
      nonce: 'apple-nonce',
    );

    expect(result.success, isTrue);
    expect(service.rawAccessToken, 'apple-access-token');
  });

  test(
    'loginWithSocialToken fails when tokens are missing in success payload',
    () async {
      final client = MockClient((_) async {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'user': {
                'id': 'uid-3',
                'email': 'broken@example.com',
                'role': 'user',
              },
              'tokens': {'accessToken': 'only-access-token'},
            },
          }),
          200,
        );
      });

      final service = AuthService(
        baseUrl: 'https://api.example.com',
        client: client,
      );

      final result = await service.loginWithSocialToken(
        provider: 'google',
        idToken: 'google-id-token',
      );

      expect(result.success, isFalse);
      expect(result.errorMessage, 'Unexpected response from server.');
    },
  );
}
