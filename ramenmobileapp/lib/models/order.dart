import 'cart_item.dart';

enum OrderStatus {
  pending,
  preparing,
  ready,
  outForDelivery,
  delivered,
  cancelled,
}

class Order {
  final String id;
  final List<CartItem> items;
  final double total;
  final OrderStatus status;
  final DateTime orderDate;
  final String deliveryMethod;
  final String? deliveryAddress;
  final String paymentMethod;
  final String? notes;
  final String? invoiceNumber;

  Order({
    required this.id,
    required this.items,
    required this.total,
    required this.status,
    required this.orderDate,
    required this.deliveryMethod,
    this.deliveryAddress,
    required this.paymentMethod,
    this.notes,
    this.invoiceNumber,
  });

  double get subtotal {
    return items.fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  double get deliveryFee {
    return deliveryMethod == 'Delivery' ? 50.0 : 0.0;
  }

  double get grandTotal {
    return subtotal + deliveryFee;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'items': items.map((item) => item.toJson()).toList(),
      'total': total,
      'status': status.name,
      'orderDate': orderDate.toIso8601String(),
      'deliveryMethod': deliveryMethod,
      'deliveryAddress': deliveryAddress,
      'paymentMethod': paymentMethod,
      'notes': notes,
      'invoiceNumber': invoiceNumber,
    };
  }

  factory Order.fromJson(Map<String, dynamic> json) {
    final deliveryMethod = json['deliveryMethod']?.toString() ?? '';
    final deliveryAddress = deliveryMethod.toLowerCase() == 'pickup'
      ? 'N/A'
      : (json['deliveryAddress']?.toString() ?? 'N/A');
    return Order(
      id: json['_id'] ?? json['id'] ?? '',
      items: (json['items'] as List).map((item) => CartItem.fromJson(item)).toList(),
      total: (json['total'] ?? 0).toDouble(),
      status: _parseOrderStatus(json['status'] ?? 'pending'),
      orderDate: DateTime.parse(json['orderDate'] ?? json['createdAt']),
      deliveryMethod: deliveryMethod,
      deliveryAddress: deliveryAddress,
      paymentMethod: json['paymentMethod'] ?? '',
      notes: json['notes']?.toString(),
      invoiceNumber: json['invoiceNumber']?.toString(),
    );
  }

  Order copyWith({
    String? id,
    List<CartItem>? items,
    double? total,
    OrderStatus? status,
    DateTime? orderDate,
    String? deliveryMethod,
    String? deliveryAddress,
    String? paymentMethod,
    String? notes,
    String? invoiceNumber,
  }) {
    return Order(
      id: id ?? this.id,
      items: items ?? this.items,
      total: total ?? this.total,
      status: status ?? this.status,
      orderDate: orderDate ?? this.orderDate,
      deliveryMethod: deliveryMethod ?? this.deliveryMethod,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      notes: notes ?? this.notes,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
    );
  }

  static OrderStatus _parseOrderStatus(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return OrderStatus.pending;
      case 'preparing':
      case 'processing':
        return OrderStatus.preparing;
      case 'ready':
        return OrderStatus.ready;
      case 'out for delivery':
      case 'out-for-delivery':
      case 'outfordelivery':
      case 'on the way':
        return OrderStatus.outForDelivery;
      case 'delivered':
        return OrderStatus.delivered;
      case 'cancelled':
        return OrderStatus.cancelled;
      default:
        return OrderStatus.pending;
    }
  }
} 