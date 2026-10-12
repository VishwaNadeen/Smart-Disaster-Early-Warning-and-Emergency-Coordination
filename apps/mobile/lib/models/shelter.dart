class Shelter {
  const Shelter({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.capacity,
    this.occupancy,
    this.status = 'unknown',
    this.phone,
    this.description,
  });

  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int? capacity;
  final int? occupancy;
  final String status;
  final String? phone;
  final String? description;

  int? get availableSpaces {
    if (capacity == null || occupancy == null) return null;
    return (capacity! - occupancy!).clamp(0, capacity!);
  }

  bool get isAvailable {
    final normalized = status.toLowerCase();
    if (normalized.contains('full') || normalized.contains('closed')) return false;
    final spaces = availableSpaces;
    return spaces == null || spaces > 0;
  }

  factory Shelter.fromJson(Map<String, dynamic> json) {
    // Keep API-specific field-name changes in this factory.
    double readDouble(List<String> keys) {
      for (final key in keys) {
        final value = json[key];
        if (value is num) return value.toDouble();
        if (value != null) {
          final parsed = double.tryParse(value.toString());
          if (parsed != null) return parsed;
        }
      }
      throw FormatException('Missing shelter coordinate: ${keys.join('/')}');
    }

    int? readInt(List<String> keys) {
      for (final key in keys) {
        final value = json[key];
        if (value is num) return value.toInt();
        if (value != null) return int.tryParse(value.toString());
      }
      return null;
    }

    String readString(List<String> keys, {String fallback = ''}) {
      for (final key in keys) {
        final value = json[key];
        if (value != null) return value.toString();
      }
      return fallback;
    }

    return Shelter(
      id: readString(['id', '_id', 'shelterId'], fallback: 'unknown'),
      name: readString(['name', 'shelterName'], fallback: 'Emergency shelter'),
      address: readString(['address', 'location', 'district'], fallback: 'Address unavailable'),
      latitude: readDouble(['latitude', 'lat']),
      longitude: readDouble(['longitude', 'lng', 'lon', 'long']),
      capacity: readInt(['capacity', 'maxCapacity']),
      occupancy: readInt(['occupancy', 'currentOccupancy', 'occupied']),
      status: readString(['status', 'availability'], fallback: 'unknown'),
      phone: json['phone']?.toString() ?? json['contactNumber']?.toString(),
      description: json['description']?.toString(),
    );
  }
}
