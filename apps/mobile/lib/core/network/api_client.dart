import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../storage/token_storage.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(
    this.message, {
    this.statusCode,
  });

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({
    http.Client? client,
    TokenStorage? tokenStorage,
  })  : _client = client ?? http.Client(),
        _tokenStorage = tokenStorage ?? TokenStorage();

  final http.Client _client;
  final TokenStorage _tokenStorage;

  Future<Map<String, String>> headers({
    bool authenticated = false,
  }) async {
    final result = <String, String>{
      'Accept': 'application/json',
    };

    if (authenticated) {
      final token = await _tokenStorage.readToken();

      if (token != null && token.isNotEmpty) {
        result['Authorization'] = 'Bearer $token';
      }
    }

    return result;
  }

  dynamic decodeResponse(http.Response response) {
    dynamic body;

    try {
      body = response.body.isEmpty
          ? null
          : jsonDecode(response.body);
    } catch (_) {
      body = response.body;
    }

    if (response.statusCode < 200 ||
        response.statusCode >= 300) {
      var message =
          'Request failed (${response.statusCode}).';

      if (body is Map) {
        final serverMessage =
            body['message'] ?? body['error'];

        if (serverMessage is List) {
          message = serverMessage.join(', ');
        } else if (serverMessage != null) {
          message = serverMessage.toString();
        }
      }

      throw ApiException(
        message,
        statusCode: response.statusCode,
      );
    }

    return body;
  }

  Future<dynamic> get(
    String path, {
    bool authenticated = true,
  }) async {
    try {
      final response = await _client
          .get(
            ApiConfig.uri(path),
            headers: await headers(
              authenticated: authenticated,
            ),
          )
          .timeout(const Duration(seconds: 20));

      return decodeResponse(response);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
        'Could not connect to the server. '
        'Check your connection and API URL. Details: $e',
      );
    }
  }

  Future<dynamic> postJson(
    String path,
    Map<String, dynamic> data, {
    bool authenticated = false,
  }) async {
    try {
      final requestHeaders =
          await headers(authenticated: authenticated);

      requestHeaders['Content-Type'] =
          'application/json';

      final response = await _client
          .post(
            ApiConfig.uri(path),
            headers: requestHeaders,
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 20));

      return decodeResponse(response);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
        'Could not connect to the server. '
        'Check your connection and API URL. Details: $e',
      );
    }
  }

  void dispose() {
    _client.close();
  }
}