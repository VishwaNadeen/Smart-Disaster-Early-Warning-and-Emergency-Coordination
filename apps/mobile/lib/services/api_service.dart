import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/config/api_config.dart';

class ApiService {
  static Future<dynamic> get(String endpoint) async {
    final response = await http.get(
      ApiConfig.uri(endpoint),
      headers: {'Accept': 'application/json'},
    );

    if (response.statusCode >= 200 &&
        response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }

    throw Exception(
      'API request failed: ${response.statusCode} ${response.body}',
    );
  }

  static Future<dynamic> post(
    String endpoint,
    Map<String, dynamic> data,
  ) async {
    final response = await http.post(
      ApiConfig.uri(endpoint),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 &&
        response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }

    throw Exception(
      'API request failed: ${response.statusCode} ${response.body}',
    );
  }
}