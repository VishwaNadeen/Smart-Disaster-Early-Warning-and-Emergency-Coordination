class Citizen {
  const Citizen({required this.name, required this.email});

  final String name;
  final String email;

  factory Citizen.fromJson(Map<String, dynamic> json) => Citizen(
        name: (json['name'] ?? json['fullName'] ?? 'Citizen').toString(),
        email: (json['email'] ?? '').toString(),
      );
}
