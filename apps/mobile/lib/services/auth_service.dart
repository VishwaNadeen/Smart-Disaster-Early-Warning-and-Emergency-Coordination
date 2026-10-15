import '../core/config/api_config.dart';
import '../core/network/api_client.dart';
import '../core/storage/token_storage.dart';

class AuthService {
  AuthService({
    ApiClient? api,
    TokenStorage? storage,
  })  : _api = api ?? ApiClient(),
        _storage = storage ?? TokenStorage();

  final ApiClient _api;
  final TokenStorage _storage;

  /// Check whether a login token is stored locally.
  Future<bool> isLoggedIn() async {
    final token = await _storage.readToken();
    return token != null && token.isNotEmpty;
  }

  /// Login an existing user.
  Future<void> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.postJson(
      ApiConfig.loginPath,
      {
        'email': email.trim(),
        'password': password,
      },
    );

    await _saveResponse(response);
  }

  /// Register a new citizen account.
  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String nationalId,
    required String address,
    required String district,
  }) async {
    final response = await _api.postJson(
      ApiConfig.registerPath,
      {
        'fullName': name.trim(),
        'email': email.trim(),
        'phone': phone.trim(),
        'password': password,
        'address': address.trim(),
        'district': district.trim(),
      },
    );

    await _saveResponse(response);
  }

  /// Extract the JWT token from the backend response.
  String? _extractToken(dynamic response) {
    if (response is! Map) {
      return null;
    }

    final nested = response['data'];
    final source = nested is Map ? nested : response;

    final token = source['token'] ??
        source['accessToken'] ??
        source['access_token'];

    if (token == null) {
      return null;
    }

    final value = token.toString().trim();
    return value.isEmpty ? null : value;
  }

  /// Save the authenticated session returned by NestJS.
  Future<void> _saveResponse(dynamic response) async {
    final token = _extractToken(response);

    if (token == null) {
      throw const ApiException(
        'The server response did not contain an authentication token.',
      );
    }

    dynamic source = response;

    if (response is Map && response['data'] is Map) {
      source = response['data'];
    }

    final user = source is Map ? source['user'] : null;

    final name = user is Map
        ? (user['fullName'] ?? user['name'])?.toString()
        : null;

    await _storage.saveSession(
      token: token,
      name: name,
    );
  }

  /// Logout and clear the locally stored session.
  Future<void> logout() async {
    await _storage.clear();
  }
}