import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  ApiConfig._();

  /// Web  → localhost (browser talks directly to the backend).
  /// Android emulator → 10.0.2.2 (special alias for the host machine).
  /// Everything else  → localhost.
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    // For Android emulator, 10.0.2.2 maps to the host's localhost.
    // If you ever test on a physical device, replace with your PC's LAN IP.
    return 'http://10.0.2.2:3000';
  }

  // NestJS global API prefix.
  static const String prefix = '/api';

  // Authentication endpoints.
  static const String loginPath = '/auth/login';
  static const String registerPath = '/auth/register';

  // Reports endpoints  (backend controller: @Controller('reports')).
  static const String submitReportPath = '/reports';
  static const String myReportsPath = '/reports/my';

  // Construct a complete API URL.
  static Uri uri(String path) {
    return Uri.parse('$baseUrl$prefix$path');
  }
}