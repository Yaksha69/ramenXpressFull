class DeliveryAddress {
  String id;
  final String recipientName;
  final String recipientMobile;
  final String street;
  final String barangay;
  final String municipality;
  final String province;
  final String zipCode;
  final double? latitude;
  final double? longitude;
  bool isDefault;

  DeliveryAddress({
    required this.id,
    required this.recipientName,
    required this.recipientMobile,
    required this.street,
    required this.barangay,
    required this.municipality,
    required this.province,
    required this.zipCode,
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  String get fullAddress =>
      '$street, $barangay, $municipality, $province $zipCode';

  bool get hasCoordinates => latitude != null && longitude != null;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'recipientName': recipientName,
      'recipientMobile': recipientMobile,
      'street': street,
      'barangay': barangay,
      'municipality': municipality,
      'province': province,
      'zipCode': zipCode,
      'latitude': latitude,
      'longitude': longitude,
      'isDefault': isDefault,
    };
  }

  factory DeliveryAddress.fromJson(Map<String, dynamic> json) {
    return DeliveryAddress(
      id: json['id'].toString(),
      recipientName: json['recipientName'] ?? '',
      recipientMobile: json['recipientMobile'] ?? '',
      street: json['street'],
      barangay: json['barangay'],
      municipality: json['municipality'],
      province: json['province'],
      zipCode: json['zipCode'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      isDefault: json['isDefault'] ?? false,
    );
  }
}