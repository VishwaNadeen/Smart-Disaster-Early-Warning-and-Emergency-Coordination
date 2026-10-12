class GroundHazardReport {
  const GroundHazardReport({
    required this.hazardType,
    required this.description,
    required this.latitude,
    required this.longitude,
  });

  final String hazardType;
  final String description;
  final double latitude;
  final double longitude;
}
