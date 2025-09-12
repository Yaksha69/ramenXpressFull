import 'dart:async';
import 'package:flutter/material.dart';
import '../widgets/delivery_animation.dart';
import '../models/order.dart';
import '../services/api_service.dart';

class OrderTrackingPage extends StatefulWidget {
  final String orderId;
  final Order? initialOrder;

  const OrderTrackingPage({
    super.key,
    required this.orderId,
    this.initialOrder,
  });

  @override
  State<OrderTrackingPage> createState() => _OrderTrackingPageState();
}

class _OrderTrackingPageState extends State<OrderTrackingPage> {
  Order? _order;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _order = widget.initialOrder;
    if (_order == null) {
      _loadOrderDetails();
    } else {
      _isLoading = false;
    }
    
    // Set up periodic refresh to get latest order status
    _startPeriodicRefresh();
  }
  
  void _startPeriodicRefresh() {
    Timer.periodic(const Duration(seconds: 10), (timer) {
      if (mounted) {
        _loadOrderDetails();
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _loadOrderDetails() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final order = await ApiService().getMobileOrderById(widget.orderId);
      print('🔍 Loaded order status: ${order.status.name}');
      print('🔍 Order delivery method: ${order.deliveryMethod}');
      
      setState(() {
        _order = order;
        _isLoading = false;
      });
    } catch (e) {
      print('❌ Error loading order: $e');
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  bool _canCancelOrder() {
    if (_order == null) return false;
    
    // Only allow cancellation for pending orders (not preparing, ready, out for delivery, or delivered)
    final status = _order!.status.name.toLowerCase();
    print('🔍 Order status: $status, Can cancel: ${status == 'pending'}');
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

      await ApiService().cancelOrder(widget.orderId);
      
      // Close loading dialog
      Navigator.of(context).pop();
      
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Order cancelled successfully'),
          backgroundColor: Colors.green,
        ),
      );
      
      // Refresh order details
      await _loadOrderDetails();
      
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Tracking'),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          // Always show cancel button for testing - will be conditional later
          TextButton(
            onPressed: _order != null && _canCancelOrder() ? _cancelOrder : null,
            child: Text(
              'Cancel',
              style: TextStyle(
                color: _order != null && _canCancelOrder() ? Colors.red : Colors.grey,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load order details',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadOrderDetails,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_order == null) {
      return const Center(
        child: Text('Order not found'),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrderDetails,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            // Delivery Status with Animation
            DeliveryStatusWidget(
              orderStatus: _order!.status.name,
              lottieAnimationPath: 'assets/animations/delivery_guy.json',
              deliveryMethod: _order!.deliveryMethod,
              orderDetails: {
                'orderId': _order!.id,
                'estimatedTime': _getEstimatedTime(),
                'deliveryAddress': _order!.deliveryAddress,
              },
            ),
            
            const SizedBox(height: 16),
            
            // Order Progress Timeline
            _buildOrderTimeline(),
            
            const SizedBox(height: 16),
            
            // Order Items
            _buildOrderItems(),
            
            const SizedBox(height: 16),
            
            // Order Summary
            _buildOrderSummary(),
            
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderTimeline() {
    final isPickup = _order!.deliveryMethod.toLowerCase() == 'pickup';
    final currentStatus = _order!.status.name.toLowerCase();
    print('🔍 Building timeline - Delivery method: ${_order!.deliveryMethod}, isPickup: $isPickup');
    print('🔍 Current order status: $currentStatus');
    
    // Force delivery timeline if status is outfordelivery
    final forceDeliveryTimeline = currentStatus == 'outfordelivery' || currentStatus == 'out for delivery';
    final showDeliverySteps = !isPickup || forceDeliveryTimeline;
    
    final steps = [
      {'title': 'Order Placed', 'status': 'completed'},
      {'title': 'Preparing', 'status': _getStepStatus('preparing')},
      if (!showDeliverySteps) ..[
        {'title': 'Ready for Pickup', 'status': _getStepStatus('ready')},
      ] else ..[
        {'title': 'Ready', 'status': _getStepStatus('ready')},
        {'title': 'Out for Delivery', 'status': _getStepStatus('out for delivery')},
        {'title': 'Delivered', 'status': _getStepStatus('delivered')},
      ],
    ];
    
    print('🔍 Show delivery steps: $showDeliverySteps');
    print('🔍 Timeline steps: ${steps.map((s) => s['title'] as String).toList()}');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Progress',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 20),
          ...steps.asMap().entries.map((entry) {
            final index = entry.key;
            final step = entry.value;
            final isLast = index == steps.length - 1;
            
            return _buildTimelineStep(
              title: step['title']!,
              status: step['status']!,
              isLast: isLast,
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildTimelineStep({
    required String title,
    required String status,
    required bool isLast,
  }) {
    Color getColor() {
      switch (status) {
        case 'completed':
          return Colors.green;
        case 'current':
          return Theme.of(context).colorScheme.primary;
        default:
          return Colors.grey[300]!;
      }
    }

    IconData getIcon() {
      switch (status) {
        case 'completed':
          return Icons.check_circle;
        case 'current':
          return Icons.radio_button_checked;
        default:
          return Icons.radio_button_unchecked;
      }
    }

    return Row(
      children: [
        Column(
          children: [
            Icon(
              getIcon(),
              color: getColor(),
              size: 24,
            ),
            if (!isLast) ...[
              Container(
                width: 2,
                height: 40,
                color: status == 'completed' ? Colors.green : Colors.grey[300],
              ),
            ],
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 40),
            child: Text(
              title,
              style: TextStyle(
                fontWeight: status == 'current' ? FontWeight.w600 : FontWeight.normal,
                color: status == 'pending' ? Colors.grey[600] : null,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderItems() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Items',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          ...(_order!.items ?? []).map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.ramen_dining,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.menuItem?.name ?? 'Unknown Item',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          'Qty: ${item.quantity}',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '₱${(item.menuItem?.price ?? 0) * item.quantity}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildOrderSummary() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Summary',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          _buildSummaryRow('Subtotal', '₱${_order!.total ?? 0}'),
          if (_order!.deliveryMethod.toLowerCase() != 'pickup')
            _buildSummaryRow('Delivery Fee', '₱50'),
          const Divider(),
          _buildSummaryRow(
            'Total',
            '₱${(_order!.total ?? 0) + (_order!.deliveryMethod.toLowerCase() != 'pickup' ? 50 : 0)}',
            isTotal: true,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.payment, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text(
                'Payment: ${_order!.paymentMethod ?? 'Cash on Delivery'}',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: isTotal ? FontWeight.w600 : FontWeight.normal,
              fontSize: isTotal ? 16 : 14,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: isTotal ? 16 : 14,
              color: isTotal ? Theme.of(context).colorScheme.primary : null,
            ),
          ),
        ],
      ),
    );
  }

  String _getStepStatus(String stepName) {
    final currentStatus = _order!.status.name.toLowerCase();
    print('🔍 Checking step: $stepName, current status: $currentStatus');
    
    switch (stepName.toLowerCase()) {
      case 'preparing':
        return currentStatus == 'preparing' ? 'current' : 
               _isStatusAfter(currentStatus, 'preparing') ? 'completed' : 'pending';
      case 'ready':
        return currentStatus == 'ready' ? 'current' : 
               _isStatusAfter(currentStatus, 'ready') ? 'completed' : 'pending';
      case 'out for delivery':
        final isOutForDelivery = currentStatus == 'outfordelivery' || currentStatus == 'out for delivery' || currentStatus == 'on the way';
        print('🔍 Out for delivery check: $isOutForDelivery');
        return isOutForDelivery ? 'current' : 
               _isStatusAfter(currentStatus, 'outfordelivery') ? 'completed' : 'pending';
      case 'delivered':
        return currentStatus == 'delivered' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  }

  bool _isStatusAfter(String currentStatus, String checkStatus) {
    const statusOrder = ['preparing', 'ready', 'outfordelivery', 'delivered'];
    
    // Handle different status formats
    String normalizedCurrent = currentStatus;
    String normalizedCheck = checkStatus;
    
    if (currentStatus == 'out for delivery') normalizedCurrent = 'outfordelivery';
    if (checkStatus == 'out for delivery') normalizedCheck = 'outfordelivery';
    
    final currentIndex = statusOrder.indexOf(normalizedCurrent);
    final checkIndex = statusOrder.indexOf(normalizedCheck);
    
    print('🔍 Status comparison - Current: $normalizedCurrent (index: $currentIndex), Check: $normalizedCheck (index: $checkIndex)');
    
    return currentIndex > checkIndex;
  }

  String _getEstimatedTime() {
    final status = _order!.status.name.toLowerCase();
    switch (status) {
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
}
