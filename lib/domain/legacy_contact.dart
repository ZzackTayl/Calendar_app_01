class Contact {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? avatarUrl;

  Contact({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.avatarUrl,
  });

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'avatarUrl': avatarUrl,
    };
  }
}

enum PermissionStatus {
  granted,
  denied,
  permanentlyDenied,
  notRequested,
}
