
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../core/config/api_config.dart';
import '../core/storage/token_storage.dart';

class GroundReportService {
  GroundReportService({TokenStorage? storage})
      : _storage = storage ?? TokenStorage();

  final TokenStorage _storage;

  /// Converts a user-friendly hazard label into the
  /// enum value expected by the NestJS backend.
  String _normalizeHazardType(String type) {
    final normalized = type
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[\s_-]+'), ' ');

    switch (normalized) {
      case 'rising water level':
      case 'rising water':
        return 'RISING_WATER';

      case 'flooding':
      case 'flood':
        return 'FLOOD';

      case 'blocked road':
        return 'BLOCKED_ROAD';

      case 'landslide crack':
        return 'LANDSLIDE_CRACK';

      case 'landslide':
        return 'LANDSLIDE';

      case 'strong winds':
      case 'strong wind':
        return 'STRONG_WIND';

      case 'fire':
        return 'FIRE';

      case 'earthquake':
        return 'EARTHQUAKE';

      case 'other':
        return 'OTHER';

    // These labels are not separate backend enum values.
      case 'damaged bridge':
      case 'fallen tree':
        return 'OTHER';

      default:
      // Preserve compatibility with callers that already
      // pass a valid backend enum value.
        final enumValue = normalized
            .replaceAll(' ', '_')
            .toUpperCase();

        const validTypes = {
          'RISING_WATER',
          'FLOOD',
          'BLOCKED_ROAD',
          'LANDSLIDE',
          'LANDSLIDE_CRACK',
          'STRONG_WIND',
          'FIRE',
          'EARTHQUAKE',
          'OTHER',
        };

        if (validTypes.contains(enumValue)) {
          return enumValue;
        }

        throw ArgumentError(
          'Unsupported hazard type: $type',
        );
    }
  }

  Future<void> submit({
    required String hazardType,
    required String description,
    required double latitude,
    required double longitude,
    List<File> attachments = const [],
    File? photo,
  }) async {
    final uri = ApiConfig.uri(
      ApiConfig.submitReportPath,
    );

    final request = http.MultipartRequest(
      'POST',
      uri,
    );

    // Add authentication token.
    final token = await _storage.readToken();

    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] =
      'Bearer $token';
    }

    // Normalize hazard type before sending it.
    request.fields.addAll({
      'hazardType': _normalizeHazardType(hazardType),
      'description': description,
      'latitude': latitude.toString(),
      'longitude': longitude.toString(),
    });

    // Combine multiple attachments with the optional
    // legacy single-photo argument.
    final filesToUpload = <File>[
      ...attachments,
      ?photo,
    ];

    if (filesToUpload.length > 10) {
      throw Exception(
        'You can upload a maximum of 10 attachments.',
      );
    }

    // The field name must match:
    // FilesInterceptor('attachments', 10, ...)
    for (final file in filesToUpload) {
      if (!await file.exists()) {
        throw Exception(
          'Attachment not found: ${file.path}',
        );
      }

      final size = await file.length();

      if (size > 20 * 1024 * 1024) {
        throw Exception(
          'Each attachment must be 20 MB or smaller.',
        );
      }

      request.files.add(
        await http.MultipartFile.fromPath(
          'attachments',
          file.path,
        ),
      );
    }

    try {
      final streamedResponse = await request
          .send()
          .timeout(
        const Duration(seconds: 60),
      );

      final response =
      await http.Response.fromStream(
        streamedResponse,
      );

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        var message =
            'Report submission failed '
            '(${response.statusCode}).';

        try {
          final body = jsonDecode(response.body);

          if (body is Map) {
            final serverMessage = body['message'];

            if (serverMessage is List) {
              message = serverMessage.join(', ');
            } else if (serverMessage != null) {
              message = serverMessage.toString();
            }
          }
        } catch (_) {
          // Keep the default message if the response
          // is not valid JSON.
        }

        throw Exception(message);
      }
    } on SocketException {
      throw Exception(
        'Cannot connect to the server. Check your '
            'internet connection and server address.',
      );
    } on HttpException {
      throw Exception(
        'A network error occurred while uploading '
            'the report.',
      );
    } on Exception {
      rethrow;
    } catch (_) {
      throw Exception(
        'Could not connect to the server. '
            'Your report was not confirmed as submitted.',
      );
    }
  }
  
Future<List<Map<String, dynamic>>> getMyReports() async {
  final uri = ApiConfig.uri('/reports/my');

  final token = await _storage.readToken();

  if (token == null || token.isEmpty) {
    throw Exception('Please log in again to view your reports.');
  }

  try {
    final response = await http.get(
      uri,
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 30));

    if (response.statusCode < 200 ||
        response.statusCode >= 300) {
      throw Exception(
        'Could not load reports (${response.statusCode}): '
        '${response.body}',
      );
    }

    if (response.body.trim().isEmpty) {
      return [];
    }

    final dynamic decoded = jsonDecode(response.body);

    dynamic rows = decoded;

    if (decoded is Map) {
      rows = decoded['data'] ??
          decoded['reports'] ??
          decoded['results'] ??
          decoded['items'];
    }

    if (rows is! List) {
      throw const FormatException(
        'The reports API did not return a list.',
      );
    }

    return rows
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  } on SocketException {
    throw Exception(
      'Cannot connect to the server. Check your connection.',
    );
  } on HttpException {
    throw Exception('A network error occurred.');
  } on Exception {
    rethrow;
  } catch (e) {
    throw Exception('Could not load reports: $e');
  }
}
}
