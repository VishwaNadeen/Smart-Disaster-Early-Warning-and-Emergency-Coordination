import '../models/shelter.dart';
import 'api_service.dart';

class ShelterService {
  /// Expected endpoint: GET /shelters.
  /// Change the path to match your backend.
  Future<List<Shelter>> getShelters() async {
    final dynamic response = await ApiService.get('/shelters');
    final dynamic payload = _unwrapResponse(response);

    final dynamic rows = payload is Map<String, dynamic>
        ? (payload['data'] ??
            payload['shelters'] ??
            payload['results'])
        : payload;

    if (rows is! List) {
      throw const FormatException(
        'Shelter API response must be a list or contain '
        'data/shelters/results list.',
      );
    }

    return rows
        .whereType<Map>()
        .map(
          (row) => Shelter.fromJson(
            Map<String, dynamic>.from(row),
          ),
        )
        .toList(growable: false);
  }

  dynamic _unwrapResponse(dynamic response) {
    // Supports common response wrappers.
    // ApiService currently returns decoded JSON directly.
    try {
      final dynamic data = response.data;
      if (data != null) return data;
    } catch (_) {
      // No .data property; response is likely already decoded JSON.
    }

    return response;
  }
}