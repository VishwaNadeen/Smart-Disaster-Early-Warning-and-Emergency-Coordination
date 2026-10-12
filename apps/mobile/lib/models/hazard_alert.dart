class HazardAlert {
  const HazardAlert({
    required this.title,
    required this.message,
    required this.level,
    this.area = '',
    this.createdAt,
  });

  final String title;
  final String message;
  final String level;
  final String area;
  final DateTime? createdAt;

  factory HazardAlert.fromJson(Map<String, dynamic> json) => HazardAlert(
        title: (json['title'] ?? json['hazardType'] ?? 'Hazard alert').toString(),
        message: (json['message'] ?? json['description'] ?? '').toString(),
        level: (json['level'] ?? json['severity'] ?? 'Information').toString(),
        area: (json['area'] ?? json['district'] ?? '').toString(),
        createdAt: DateTime.tryParse(
          (json['createdAt'] ?? json['issuedAt'] ?? '').toString(),
        ),
      );
}
