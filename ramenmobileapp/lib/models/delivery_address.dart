class DeliveryAddress {
  String id;
  final String street;
  final String barangay;
  final String municipality;
  final String province;
  final String zipCode;
  bool isDefault;

  DeliveryAddress({
    required this.id,
    required this.street,
    required this.barangay,
    required this.municipality,
    required this.province,
    required this.zipCode,
    this.isDefault = false,
  });

  String get fullAddress =>
      '$street, $barangay, $municipality, $province $zipCode';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'street': street,
      'barangay': barangay,
      'municipality': municipality,
      'province': province,
      'zipCode': zipCode,
      'isDefault': isDefault,
    };
  }

  factory DeliveryAddress.fromJson(Map<String, dynamic> json) {
    return DeliveryAddress(
      id: json['id'],
      street: json['street'],
      barangay: json['barangay'],
      municipality: json['municipality'],
      province: json['province'],
      zipCode: json['zipCode'],
      isDefault: json['isDefault'] ?? false,
    );
  }
}