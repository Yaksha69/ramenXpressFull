import 'menu_item.dart';

class CartItem {
  final MenuItem menuItem;
  final int quantity;
  final List<AddOn> selectedAddOns;

  CartItem({
    required this.menuItem,
    required this.quantity,
    required this.selectedAddOns,
  });

  double get totalPrice {
    double addOnsPrice = selectedAddOns.fold(0.0, (sum, addOn) => sum + addOn.price);
    return (menuItem.price + addOnsPrice) * quantity;
  }

  double get unitPrice {
    return menuItem.price +
        selectedAddOns.fold(0.0, (sum, addon) => sum + addon.price);
  }

  CartItem copyWith({
    MenuItem? menuItem,
    int? quantity,
    List<AddOn>? selectedAddOns,
  }) {
    return CartItem(
      menuItem: menuItem ?? this.menuItem,
      quantity: quantity ?? this.quantity,
      selectedAddOns: selectedAddOns ?? this.selectedAddOns,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'menuItem': menuItem.toJson(),
      'quantity': quantity,
      'selectedAddOns': selectedAddOns.map((addOn) => addOn.toJson()).toList(),
    };
  }

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      menuItem: MenuItem.fromJson(json['menuItem']),
      quantity: json['quantity'] ?? 1,
      selectedAddOns: (json['selectedAddOns'] as List? ?? [])
          .map((addOnJson) => AddOn.fromJson(addOnJson))
          .toList(),
    );
  }
}
