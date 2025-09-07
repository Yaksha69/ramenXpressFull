class MenuItem {
  final String? id;
  final String name;
  final double price;
  final String image;
  final String category;
  final List<AddOn> availableAddOns;

  MenuItem({
    this.id,
    required this.name,
    required this.price,
    required this.image,
    required this.category,
    this.availableAddOns = const [],
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'image': image,
      'category': category,
      'availableAddOns': availableAddOns.map((addon) => addon.toJson()).toList(),
    };
  }

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['_id']?.toString() ?? json['id']?.toString(),
      name: json['name']?.toString() ?? '',
      price: (json['price'] ?? 0).toDouble(),
      image: json['image']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      availableAddOns: (json['availableAddOns'] as List?)
          ?.map((addon) => AddOn.fromJson(addon))
          .toList() ?? [],
    );
  }
}

class AddOn {
  final String name;
  final double price;

  AddOn({
    required this.name,
    required this.price,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'price': price,
    };
  }

  factory AddOn.fromJson(Map<String, dynamic> json) {
    return AddOn(
      name: json['name']?.toString() ?? '',
      price: (json['price'] ?? 0).toDouble(),
    );
  }
} 