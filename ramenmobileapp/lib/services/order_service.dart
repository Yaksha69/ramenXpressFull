import 'dart:convert';
import 'dart:math';
import 'dart:developer' as developer;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/order.dart';
import '../models/cart_item.dart';
import 'api_service.dart';

class OrderService {
  static const String _ordersKey = 'orders';
  static final OrderService _instance = OrderService._internal();
  
  factory OrderService() {
    return _instance;
  }
  
  OrderService._internal();

  final ApiService _apiService = ApiService();
  List<Order> _orders = [];

  List<Order> get orders => List.unmodifiable(_orders);

  Future<void> loadOrders() async {
    try {
      // Try to load from API first using customer-specific endpoint
      final apiOrders = await _apiService.getCustomerOrders();
      print('🟢 Orders received from API: ${apiOrders.length} ${apiOrders}');
      for (var order in apiOrders) {
        print('Order details: ${order.toJson()}');
      }
      _orders = apiOrders;
      await saveOrders(); // Save API data locally
    } catch (e) {
      print('🔴 Error loading orders from API: ${e}');
      developer.log('Error loading orders from API: ${e}', name: 'OrderService');
      
      // Fallback to local storage
    try {
      final prefs = await SharedPreferences.getInstance();
      final ordersJson = prefs.getString(_ordersKey);
      if (ordersJson != null) {
        final List<dynamic> ordersList = json.decode(ordersJson);
        _orders = ordersList.map((order) => Order.fromJson(order)).toList();
      }
    } catch (e) {
        developer.log('Error loading orders from local storage: ${e}', name: 'OrderService');
      _orders = [];
      }
    }
  }

  Future<void> saveOrders() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ordersJson = json.encode(
        _orders.map((order) => order.toJson()).toList(),
      );
      await prefs.setString(_ordersKey, ordersJson);
    } catch (e) {
      developer.log('Error saving orders: $e', name: 'OrderService');
    }
  }

  Future<Order> createOrder({
    required List<CartItem> items,
    required String deliveryMethod,
    String? deliveryAddress,
    required String paymentMethod,
    String? notes,
  }) async {
    try {
      // Try to create order via API first
      final order = await _apiService.createMobileOrder(
        items: items,
        deliveryMethod: deliveryMethod,
        deliveryAddress: deliveryAddress,
        paymentMethod: paymentMethod,
        notes: notes,
      );
      
      // Also save locally for offline access
      _orders.insert(0, order);
      await saveOrders();
      return order;
    } catch (e) {
      developer.log('Error creating order via API: $e', name: 'OrderService');
      
      // Fallback to local storage if API fails
    final orderId = _generateOrderId();
    final invoiceNumber = _generateInvoiceNumber();
    
    final order = Order(
      id: orderId,
      items: items,
      total: items.fold(0.0, (sum, item) => sum + item.totalPrice) + 
             (deliveryMethod == 'Delivery' ? 50.0 : 0.0),
      status: OrderStatus.pending,
      orderDate: DateTime.now(),
      deliveryMethod: deliveryMethod,
      deliveryAddress: deliveryAddress,
      paymentMethod: paymentMethod,
      notes: notes,
      invoiceNumber: invoiceNumber,
    );

      _orders.insert(0, order);
    await saveOrders();
    return order;
    }
  }

  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    final index = _orders.indexWhere((order) => order.id == orderId);
    if (index != -1) {
      _orders[index] = _orders[index].copyWith(status: status);
      await saveOrders();
    }
  }

  Order? getOrderById(String orderId) {
    try {
      return _orders.firstWhere((order) => order.id == orderId);
    } catch (e) {
      return null;
    }
  }

  List<Order> getOrdersByStatus(OrderStatus status) {
    return _orders.where((order) => order.status == status).toList();
  }

  String _generateOrderId() {
    final random = Random();
    final orderNumber = random.nextInt(10000); // Generate 0-9999
    return orderNumber.toString().padLeft(4, '0'); // Ensure 4 digits with leading zeros
  }

  String _generateInvoiceNumber() {
    final random = Random();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final randomNum = random.nextInt(10000);
    return 'INV$timestamp${randomNum.toString().padLeft(4, '0')}';
  }
}
