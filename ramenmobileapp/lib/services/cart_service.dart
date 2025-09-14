import 'dart:convert';
import 'dart:developer' as developer;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cart_item.dart';
import '../models/menu_item.dart';

class CartService {
  static const String _cartKey = 'cart_items';
  static final CartService _instance = CartService._internal();
  
  factory CartService() {
    return _instance;
  }
  
  CartService._internal();

  List<CartItem> _cartItems = [];
  List<CartItem> get cartItems => List.unmodifiable(_cartItems);

  int get itemCount {
    return _cartItems.fold(0, (sum, item) => sum + item.quantity);
  }

  double get total {
    return _cartItems.fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  bool get isEmpty => _cartItems.isEmpty;

  Future<void> loadCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cartJson = prefs.getString(_cartKey);
      if (cartJson != null) {
        final List<dynamic> cartList = json.decode(cartJson);
        _cartItems = cartList.map((item) => CartItem.fromJson(item)).toList();
      }
    } catch (e) {
      developer.log('Error loading cart: $e', name: 'CartService');
      _cartItems = [];
    }
  }

  Future<void> saveCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cartJson = json.encode(
        _cartItems.map((item) => item.toJson()).toList(),
      );
      await prefs.setString(_cartKey, cartJson);
    } catch (e) {
      developer.log('Error saving cart: $e', name: 'CartService');
    }
  }

  Future<void> addToCart(MenuItem menuItem, List<AddOn> selectedAddOns, {List<String>? removedIngredients}) async {
    final removedIngredientsToUse = removedIngredients ?? [];
    final existingIndex = _cartItems.indexWhere(
      (item) =>
          item.menuItem.name == menuItem.name &&
          _areAddOnsEqual(item.selectedAddOns, selectedAddOns) &&
          _areRemovedIngredientsEqual(item.removedIngredients, removedIngredientsToUse),
    );

    if (existingIndex != -1) {
      _cartItems[existingIndex] = _cartItems[existingIndex].copyWith(
        quantity: _cartItems[existingIndex].quantity + 1,
      );
    } else {
      _cartItems.add(
        CartItem(
          menuItem: menuItem,
          quantity: 1,
          selectedAddOns: selectedAddOns,
          removedIngredients: removedIngredientsToUse,
        ),
      );
    }
    await saveCart();
  }

  Future<void> updateQuantity(String itemName, int quantity) async {
    final index = _cartItems.indexWhere((item) => item.menuItem.name == itemName);
    if (index != -1) {
      if (quantity <= 0) {
        _cartItems.removeAt(index);
      } else {
        _cartItems[index] = _cartItems[index].copyWith(quantity: quantity);
      }
      await saveCart();
    }
  }

  Future<void> removeFromCart(String itemName) async {
    _cartItems.removeWhere((item) => item.menuItem.name == itemName);
    await saveCart();
  }

  Future<void> clearCart() async {
    _cartItems.clear();
    await saveCart();
  }

  bool _areRemovedIngredientsEqual(List<String> ingredients1, List<String> ingredients2) {
    if (ingredients1.length != ingredients2.length) return false;
    final sorted1 = List<String>.from(ingredients1)..sort();
    final sorted2 = List<String>.from(ingredients2)..sort();
    for (int i = 0; i < sorted1.length; i++) {
      if (sorted1[i] != sorted2[i]) {
        return false;
      }
    }
    return true;
  }

  bool _areAddOnsEqual(List<AddOn> addOns1, List<AddOn> addOns2) {
    if (addOns1.length != addOns2.length) return false;
    for (int i = 0; i < addOns1.length; i++) {
      if (addOns1[i].name != addOns2[i].name ||
          addOns1[i].price != addOns2[i].price) {
        return false;
      }
    }
    return true;
  }
}
