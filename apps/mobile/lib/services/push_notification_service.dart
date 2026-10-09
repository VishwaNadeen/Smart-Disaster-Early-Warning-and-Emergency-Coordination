
import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class PushNotificationService {
  PushNotificationService({
    required this.apiBaseUrl,
    required this.getAccessToken,
  });

  final String apiBaseUrl;
  final Future<String?> Function() getAccessToken;

  Future<void> registerDevice() async {
    final settings = await FirebaseMessaging.instance
        .requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus ==
        AuthorizationStatus.denied) {
      return;
    }

    final token = await FirebaseMessaging.instance.getToken();

    if (token != null) {
      await _sendToken(token);
    }

    FirebaseMessaging.instance.onTokenRefresh.listen(
      (newToken) async {
        try {
          await _sendToken(newToken);
        } catch (error) {
          debugPrint('FCM token refresh failed: $error');
        }
      },
    );
  }

  Future<void> _sendToken(String token) async {
    final accessToken = await getAccessToken();

    if (accessToken == null || accessToken.isEmpty) {
      throw Exception('User is not authenticated');
    }

    final response = await http.post(
      Uri.parse('$apiBaseUrl/notifications/devices'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'token': token,
      }),
    );

    if (response.statusCode < 200 ||
        response.statusCode >= 300) {
      throw Exception(
        'Failed to register device: ${response.statusCode}',
      );
    }
  }

  Future<void> unregisterDevice() async {
    final token = await FirebaseMessaging.instance.getToken();
    final accessToken = await getAccessToken();

    if (token == null ||
        accessToken == null ||
        accessToken.isEmpty) {
      return;
    }

    final response = await http.delete(
      Uri.parse('$apiBaseUrl/notifications/devices'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'token': token,
      }),
    );

    if (response.statusCode < 200 ||
        response.statusCode >= 300) {
      throw Exception('Failed to unregister device');
    }
  }
}
