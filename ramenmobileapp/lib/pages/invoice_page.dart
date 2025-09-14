import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../widgets/delivery_animation.dart';

class InvoicePage extends StatefulWidget {
  final Map<String, dynamic> order;
  const InvoicePage({super.key, required this.order});

  @override
  State<InvoicePage> createState() => _InvoicePageState();
}

class _InvoicePageState extends State<InvoicePage> {
  late Map<String, dynamic> order;
  late final NumberFormat currencyFormat;
  late final DateFormat dateFormat;
  late final OrderStatusUpdateCallback _orderStatusUpdateHandler;

  @override
  void initState() {
    super.initState();
    order = widget.order;
    currencyFormat = NumberFormat.currency(symbol: '₱');
    dateFormat = DateFormat('MMM dd, yyyy hh:mm a');
    
    // Set socket context for notifications
    SocketService().setContext(context);
    
    // Listen for real-time order status updates
    SocketService().connect();
    _orderStatusUpdateHandler = (data) {
      if (!mounted) return;
      if (data['orderId'] == order['id'] || data['orderId'] == order['_id']) {
        setState(() {
          order = Map<String, dynamic>.from(data['order']);
        });
      }
    };
    SocketService().onOrderStatusUpdate = _orderStatusUpdateHandler;
  }

  @override
  void dispose() {
    // Remove the order status update handler to prevent setState after dispose
    if (SocketService().onOrderStatusUpdate == _orderStatusUpdateHandler) {
      SocketService().onOrderStatusUpdate = null;
    }
    super.dispose();
  }

  String _formatDate(dynamic dateValue) {
    if (dateValue == null) {
      return dateFormat.format(DateTime.now());
    }
    
    if (dateValue is DateTime) {
      return dateFormat.format(dateValue);
    }
    
    if (dateValue is String) {
      try {
        return dateFormat.format(DateTime.parse(dateValue));
      } catch (e) {
        return dateFormat.format(DateTime.now());
      }
    }
    
    return dateFormat.format(DateTime.now());
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return const Color.fromARGB(255, 88, 97, 255);
      case 'preparing':
        return const Color(0xFF1A1A1A); 
      case 'ready':
        return Colors.blue;
      case 'outfordelivery':
      case 'out for delivery':
        return const Color.fromARGB(255, 255, 165, 0); 
      case 'delivered':
        return const Color.fromARGB(255, 10, 180, 10); 
      case 'cancelled':
        return const Color(0xFFD32D43); 
      default:
        return const Color.fromARGB(255, 175, 175, 175); 
    }
  }


  Widget _buildOrderProgress(String status) {
    final steps = [
      'Pending',
      'Preparing',
      'Ready',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ];
    final descriptions = [
      'Your order has been received',
      'Your food is being prepared',
      'Your order is ready for pickup/delivery',
      'On the way to you!',
      'Order completed successfully',
      'Order was cancelled',
    ];
    final statusMap = {
      'pending': 0,
      'preparing': 1,
      'ready': 2,
      'outfordelivery': 3,
      'out for delivery': 3,
      'delivered': 4,
      'cancelled': 5,
    };
    int currentStep = statusMap[status.toLowerCase()] ?? 0;
    bool isCancelled = status.toLowerCase() == 'cancelled';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD32D43), width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Order Progress', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            ...List.generate(steps.length, (i) {
              bool isActive = isCancelled ? i == steps.length - 1 : i <= currentStep;
              bool isCurrent = isCancelled ? i == steps.length - 1 : i == currentStep;
              Color stepColor = _getStatusColor(steps[i]);
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 2),
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: isActive ? stepColor : Colors.white,
                      border: Border.all(color: isActive ? stepColor : Colors.grey, width: 2),
                      shape: BoxShape.circle,
                    ),
                    child: isActive
                        ? Icon(Icons.check, color: Colors.white, size: 16)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          steps[i],
                          style: TextStyle(
                            fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                            color: isCurrent ? stepColor : Colors.black,
                            fontSize: isCurrent ? 16 : 14,
                          ),
                        ),
                        if (isCurrent)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4.0),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: stepColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text('Current Status', style: TextStyle(color: stepColor, fontSize: 12)),
                            ),
                          ),
                        Text(descriptions[i], style: const TextStyle(fontSize: 12)),
                        if (i < steps.length - 1)
                          Container(
                            margin: const EdgeInsets.symmetric(vertical: 2),
                            width: 2,
                            height: 18,
                            color: Colors.grey[300],
                          ),
                      ],
                    ),
                  ),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderDetails() {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Order Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            _buildDetailRow('Order ID', 'Order #${order['id']}'),
            _buildDetailRow('Date', _formatDate(order['date'] ?? order['orderDate'])),
            _buildDetailRow('Delivery Method', order['deliveryMethod'] ?? '-'),
            if (order['deliveryAddress'] != null && order['deliveryAddress'].toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Address', style: TextStyle(fontWeight: FontWeight.normal)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        order['deliveryAddress'].toString(),
                        style: const TextStyle(fontSize: 14),
                        softWrap: true,
                        overflow: TextOverflow.visible,
                        textAlign: TextAlign.start,
                      ),
                    ),
                  ],
                ),
              ),
            if (order['notes'] != null && order['notes'].toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Notes', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      order['notes'].toString(),
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentDetails() {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Payment Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            _buildDetailRow('Payment Method', order['paymentMethod'] ?? '-'),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderItems() {
    final items = order['items'] as List<dynamic>? ?? [];
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Order Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ...items.map((item) {
              // Handle both CartItem structure and simple item structure
              String name;
              double price;
              int quantity;
              List<String> addonNames;
              
              if (item['menuItem'] != null) {
                // CartItem structure
                final menuItem = item['menuItem'] as Map<String, dynamic>;
                name = menuItem['name'] ?? '-';
                price = (menuItem['price'] ?? 0.0).toDouble();
                quantity = item['quantity'] ?? 1;
                final addons = item['selectedAddOns'] as List<dynamic>? ?? [];
                addonNames = addons.map((addon) => addon['name']?.toString() ?? '').where((name) => name.isNotEmpty).toList();
              } else {
                // Simple item structure (from order history)
                name = item['name'] ?? '-';
                price = (item['price'] ?? 0.0).toDouble();
                quantity = item['quantity'] ?? 1;
                final addons = item['addons'] as List<dynamic>? ?? [];
                addonNames = addons.where((addon) => addon != null).map((addon) => addon.toString()).toList();
              }
              
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text('${currencyFormat.format(price)} x $quantity'),
                          if (addonNames.isNotEmpty)
                            Text('Add-ons: ${addonNames.join(', ')}', style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                    Text(currencyFormat.format(price * quantity)),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderSummary() {
    final subtotal = order['total'] ?? 0.0;
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Order Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            _buildDetailRow('Subtotal', currencyFormat.format(subtotal)),
            const Divider(),
            _buildDetailRow('Total', currencyFormat.format(subtotal), isTotal: true),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isTotal ? FontWeight.bold : FontWeight.normal)),
          Flexible(
            child: Text(
              value,
              style: TextStyle(fontWeight: isTotal ? FontWeight.bold : FontWeight.normal, fontSize: isTotal ? 18 : 14),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }

  bool _canCancelOrder() {
    final status = order['status']?.toString().toLowerCase() ?? '';
    return status == 'pending';
  }

  Future<void> _cancelOrder() async {
    // Show confirmation dialog
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order'),
        content: const Text('Are you sure you want to cancel this order? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep Order'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Cancel Order'),
          ),
        ],
      ),
    );

    if (shouldCancel != true) return;

    try {
      // Show loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      final orderId = order['id'] ?? order['_id'];
      await ApiService().cancelOrder(orderId.toString());
      
      // Close loading dialog
      Navigator.of(context).pop();
      
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Order cancelled successfully'),
          backgroundColor: Colors.green,
        ),
      );
      
      // Refresh order data from server to get the latest status
      try {
        final orderId = order['id'] ?? order['_id'];
        final updatedOrder = await ApiService().getMobileOrderById(orderId.toString());
        setState(() {
          order = updatedOrder.toJson();
        });
      } catch (refreshError) {
        // If refresh fails, at least update status locally
        setState(() {
          order['status'] = 'cancelled';
        });
      }
      
    } catch (e) {
      // Close loading dialog
      Navigator.of(context).pop();
      
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel order: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  bool _shouldShowAnimation(String status) {
    return status.toLowerCase() == 'out for delivery' || 
           status.toLowerCase() == 'outfordelivery' ||
           status.toLowerCase() == 'on the way';
  }

  String _getEstimatedTime(String status) {
    switch (status.toLowerCase()) {
      case 'preparing':
        return '15-20 minutes';
      case 'ready':
        return '5-10 minutes';
      case 'outfordelivery':
      case 'out for delivery':
      case 'on the way':
        return '10-15 minutes';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Calculating...';
    }
  }

  void _showReviewDialog() {
    int selectedRating = 0;
    final TextEditingController commentController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Row(
                children: [
                  Icon(Icons.star, color: Colors.orange),
                  SizedBox(width: 8),
                  Text('Rate Your Order'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('How was your experience?'),
                  const SizedBox(height: 16),
                  // Star Rating
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            selectedRating = index + 1;
                          });
                        },
                        child: Icon(
                          Icons.star,
                          size: 40,
                          color: index < selectedRating ? Colors.orange : Colors.grey[300],
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  // Comment TextField
                  TextField(
                    controller: commentController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Tell us about your experience (optional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                  ),
                  onPressed: selectedRating > 0 ? () => _submitReview(selectedRating, commentController.text) : null,
                  child: const Text('Submit Review', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _submitReview(int rating, String comment) async {
    try {
      // Show loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      final orderId = order['id'] ?? order['_id'];
      await ApiService().submitReview(orderId.toString(), rating, comment);
      
      // Close loading dialog
      Navigator.of(context).pop();
      
      // Close review dialog
      Navigator.of(context).pop();
      
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Thank you for your review!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      // Close loading dialog
      Navigator.of(context).pop();
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to submit review: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFFD32D43)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Order Invoice', style: TextStyle(color: Color(0xFF1A1A1A), fontWeight: FontWeight.bold)),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('LIVE', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                IconButton(
                  icon: const Icon(Icons.share, color: Color(0xFF1A1A1A)),
                  onPressed: () {},
                ),
              ],
            ),
          ),
        ],
      ),
      backgroundColor: Colors.grey[100],
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Add Lottie animation for delivery status
            if (_shouldShowAnimation(order['status'] ?? 'pending'))
              DeliveryStatusWidget(
                orderStatus: order['status'] ?? 'pending',
                lottieAnimationPath: 'assets/animations/delivery_guy.json',
                orderDetails: {
                  'orderId': order['id'] ?? order['_id'],
                  'estimatedTime': _getEstimatedTime(order['status'] ?? 'pending'),
                  'deliveryAddress': order['deliveryAddress'],
                },
              ),
            _buildOrderProgress(order['status'] ?? 'pending'),
            _buildOrderDetails(),
            _buildPaymentDetails(),
            _buildOrderItems(),
            _buildOrderSummary(),
            const SizedBox(height: 24),
            // Cancel order button (only show if order can be cancelled)
            if (_canCancelOrder()) ...[
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _cancelOrder,
                  child: const Text(
                    'Cancel Order',
                    style: TextStyle(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            // Show review button for delivered orders
            if ((order['status'] ?? 'pending').toLowerCase() == 'delivered') ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => _showReviewDialog(),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.star, color: Colors.white),
                      SizedBox(width: 8),
                      Text('Leave a Review', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD32D43),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pushReplacementNamed(context, '/order-history');
                },
                child: const Text('Back to Order History', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}