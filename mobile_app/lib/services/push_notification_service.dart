import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile_app/services/news_api_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // If you're going to use other Firebase services in the background, such as Firestore,
  // make sure you call `initializeApp` before using other Firebase services.
  await Firebase.initializeApp();
  debugPrint('Handling a background message: ${message.messageId}');
}

class PushNotificationService {
  final NewsApiService _apiService;
  late final FirebaseMessaging _messaging;

  PushNotificationService(this._apiService);

  Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
      _messaging = FirebaseMessaging.instance;

      FirebaseMessaging.onBackgroundMessage(
        _firebaseMessagingBackgroundHandler,
      );

      await _requestPermission();
      await _setupToken();
      _setupMessageHandlers();
    } catch (e) {
      debugPrint('Failed to initialize push notifications: $e');
    }
  }

  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    debugPrint(
      'User granted notification permission: ${settings.authorizationStatus}',
    );
  }

  Future<void> _setupToken() async {
    if (!_apiService.hasAccessToken) {
      debugPrint('Skipping FCM token registration: No API access token.');
      return;
    }

    try {
      final token = await _messaging.getToken();
      if (token != null) {
        debugPrint('FCM Token: $token');
        await _registerTokenWithBackend(token);
      }

      // Listen to token refreshes
      _messaging.onTokenRefresh.listen((newToken) {
        _registerTokenWithBackend(newToken);
      });
    } catch (e) {
      debugPrint('Failed to get FCM token: $e');
    }
  }

  Future<void> _registerTokenWithBackend(String token) async {
    try {
      final platform = kIsWeb
          ? 'web'
          : Platform.isIOS
          ? 'ios'
          : 'android';

      await _apiService.registerNotificationDevice(
        token: token,
        platform: platform,
        deviceName: 'Flutter Device',
      );
      debugPrint('Successfully registered FCM token with backend.');
    } catch (e) {
      debugPrint('Error registering FCM token: $e');
    }
  }

  void _setupMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Got a message whilst in the foreground!');
      debugPrint('Message data: ${message.data}');

      if (message.notification != null) {
        debugPrint(
          'Message also contained a notification: ${message.notification}',
        );
        // Show in-app banner or local notification here if needed
      }
    });

    // Handle messages that open the app from background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('A new onMessageOpenedApp event was published!');
      _handleMessageAction(message);
    });

    // Handle initial message if the app was terminated and opened via push
    _messaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        _handleMessageAction(message);
      }
    });
  }

  void _handleMessageAction(RemoteMessage message) {
    if (message.data.containsKey('cardId')) {
      final cardId = message.data['cardId'];
      // e.g., navigate to specific news card
      debugPrint('Should navigate to card ID: $cardId');
    }
  }
}
