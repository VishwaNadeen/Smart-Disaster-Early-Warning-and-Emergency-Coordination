import 'dart:convert';

import 'package:http/http.dart' as http;

/// Uses your existing API base URL and JWT token provider.
/// Provide the same base URL convention used by your ApiService:
/// e.g. http://10.0.2.2:3000/api for Android emulator,
/// or http://localhost:3000/api for iOS simulator/web on the host machine.
class HelpRequestService {
  HelpRequestService({
    required this.apiBaseUrl,
    required this.readAccessToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String apiBaseUrl;
  final Future<String?> Function() readAccessToken;
  final http.Client _client;

  Future<Map<String, dynamic>> getMyProfile() async {
    final token = await readAccessToken();
    if (token == null || token.trim().isEmpty) {
      throw Exception('Your session has expired. Please sign in again.');
    }

    final base = apiBaseUrl.endsWith('/')
        ? apiBaseUrl.substring(0, apiBaseUrl.length - 1)
        : apiBaseUrl;
    final response = await _client.get(
      Uri.parse('$base/users/me'),
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    } catch (_) {
      decoded = <String, dynamic>{'message': response.body};
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? (decoded['message'] ?? decoded['error'] ?? 'Could not load profile')
          : 'Could not load profile';
      throw Exception('$message (HTTP ${response.statusCode})');
    }

    if (decoded is Map<String, dynamic>) {
      final data = decoded['data'];
      if (data is Map<String, dynamic>) return data;
      return decoded;
    }
    throw Exception('The server returned an unexpected profile response.');
  }

  Future<Map<String, dynamic>> createHelpRequest({
    required String description,
    required String urgency,
    required double latitude,
    required double longitude,
    required String locationDescription,
    required String district,
    required String city,
  }) async {
    final token = await readAccessToken();
    if (token == null || token.trim().isEmpty) {
      throw Exception('Your session has expired. Please sign in again.');
    }

    final base = apiBaseUrl.endsWith('/')
        ? apiBaseUrl.substring(0, apiBaseUrl.length - 1)
        : apiBaseUrl;
    final uri = Uri.parse('$base/help-requests');

    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'description': description,
        'urgency': urgency,
        // The current NestJS DTO validates coordinates with IsLatitude/IsLongitude,
        // which expect strings; Mongoose stores them as numbers.
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
        'locationDescription': locationDescription,
        'district': district,
        'city': city,
      }),
    );

    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    } catch (_) {
      decoded = <String, dynamic>{'message': response.body};
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? (decoded['message'] ?? decoded['error'] ?? 'Request failed')
          : 'Request failed';
      throw Exception('$message (HTTP ${response.statusCode})');
    }

    if (decoded is Map<String, dynamic>) {
      final data = decoded['data'];
      if (data is Map<String, dynamic>) return data;
      return decoded;
    }
    throw Exception('The server returned an unexpected response.');
  }

  void close() => _client.close();
}
