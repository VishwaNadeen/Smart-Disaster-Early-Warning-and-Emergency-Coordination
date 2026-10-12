import '../models/hazard_alert.dart';

class AlertService {
  AlertService();

  /// Fetch active alerts.
  ///
  /// The backend currently has no dedicated hazard-alerts endpoint,
  /// so this returns an empty list gracefully until one is added.
  Future<List<HazardAlert>> getActiveAlerts() async {
    // TODO: Update this once a hazard-alerts endpoint is added to the backend.
    return [];
  }
}
