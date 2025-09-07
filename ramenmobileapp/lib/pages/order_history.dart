import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'invoice_page.dart';
import '../services/order_service.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class OrderHistoryPage extends StatefulWidget {
  const OrderHistoryPage({super.key});

  @override
  State<OrderHistoryPage> createState() => _OrderHistoryPageState();
}

class _OrderHistoryPageState extends State<OrderHistoryPage> {
  final OrderService _orderService = OrderService();
  List<Order> orders = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    SocketService().connect();
    SocketService().onOrderStatusUpdate = (data) {
      setState(() {
        final idx = orders.indexWhere((o) => o.id == data['orderId'] || o.id == data['order']['_id']);
        if (idx != -1) {
          final updatedOrders = List<Order>.from(orders);
          updatedOrders[idx] = Order.fromJson(Map<String, dynamic>.from(data['order']));
          orders = updatedOrders;
        }
      });
    };
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    await ApiService().loadToken();
    await _orderService.loadOrders();
    setState(() {
      orders = _orderService.orders;
      isLoading = false;
    });
  }

  Future<void> _refreshOrders() async {
    setState(() {
      isLoading = true;
    });
    await ApiService().loadToken();
    await _loadOrders();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return const Color.fromARGB(255, 88, 97, 255); // Blue
      case 'preparing':
        return const Color(0xFF1A1A1A); // Black
      case 'ready':
        return const Color.fromARGB(255, 185, 255, 73); // Green
      case 'delivered':
        return const Color.fromARGB(255, 10, 180, 10); // Green
      case 'cancelled':
        return const Color(0xFFD32D43); // Red
      default:
        return const Color.fromARGB(255, 175, 175, 175); // Grey
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '\u20b1');
    final dateFormat = DateFormat('MMM d, yyyy h:mm a');

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refreshOrders,
        child: CustomScrollView(
        slivers: [
          SliverAppBar(
            automaticallyImplyLeading: false,
            floating: true,
            pinned: true,
            expandedHeight: 120,
            backgroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: Colors.white,
                padding: const EdgeInsets.only(top: 60, left: 16, right: 16),
                child: Row(
                  children: [
                    const Text(
                      'Order History',
                      style: TextStyle(
                        color: Color(0xFF1A1A1A),
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    CircleAvatar(
                      backgroundImage: AssetImage('assets/adminPIC.png'),
                      radius: 20,
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: isLoading
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : orders.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              'assets/logo.png',
                              height: 100,
                              opacity: const AlwaysStoppedAnimation(0.5),
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'No orders yet',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Your order history will appear here',
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF1A1A1A),
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 32),
                          ],
                        ),
                      )
                    : Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(0, 16, 0, 8),
                              child: Text(
                                'Latest Orders',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1A1A1A),
                                ),
                              ),
                            ),
                            ...orders.map((order) {
                              final orderId = order.id.length > 4
                                  ? order.id.substring(order.id.length - 4)
                                  : order.id.padLeft(4, '0');
                              return Card(
                                margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
                                child: InkWell(
                                  splashColor: Color(0x1AD32D43),
                                  highlightColor: Colors.transparent,
                                  onTap: () {
                                    // Navigate to invoice page with order details
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => InvoicePage(order: order.toJson()),
                                      ),
                                    );
                                  },
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            SizedBox(
                                              width: 120,
                                              child: Text(
                                                'Order #$orderId',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                  color: Color(0xFF1A1A1A),
                                                ),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              decoration: BoxDecoration(
                                                color: _getStatusColor(order.status.name).withAlpha((0.08 * 255).toInt()),
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                order.status.name,
                                                style: TextStyle(
                                                  color: _getStatusColor(order.status.name),
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          dateFormat.format(order.orderDate),
                                          style: TextStyle(
                                            color: Color(0xFF1A1A1A),
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            SizedBox(
                                              width: MediaQuery.of(context).size.width * 0.5,
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    'Delivery: ${order.deliveryMethod}${order.deliveryMethod.toLowerCase() == 'pickup' ? ' - N/A' : (order.deliveryAddress != null && order.deliveryAddress!.isNotEmpty ? ' - ' + order.deliveryAddress! : ' - N/A')}',
                                                    style: TextStyle(
                                                      color: Color(0xFF1A1A1A),
                                                      fontSize: 12,
                                                    ),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    'Payment: ${order.paymentMethod}',
                                                    style: TextStyle(
                                                      color: Color(0xFF1A1A1A),
                                                      fontSize: 12,
                                                    ),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            SizedBox(
                                              width: MediaQuery.of(context).size.width * 0.25,
                                              child: Text(
                                                currencyFormat.format(order.total),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                  color: Color(0xFF1A1A1A),
                                                ),
                                                textAlign: TextAlign.right,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
          ),
        ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withValues(red: 128, green: 128, blue: 128, alpha: 10),
              spreadRadius: 1,
              blurRadius: 10,
              offset: const Offset(0, -1),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: 2, // History is selected
          onTap: (index) {
            switch (index) {
              case 0:
                Navigator.pushReplacementNamed(context, '/home');
                break;
              case 1:
                Navigator.pushReplacementNamed(context, '/payment');
                break;
              case 2:
                // Already on order history page
                break;
              case 3:
                Navigator.pushReplacementNamed(context, '/profile');
                break;
            }
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.shopping_cart), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.history), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.person), label: ''),
          ],
          selectedItemColor: Color(0xFFD32D43),
          unselectedItemColor: Color(0xFF1A1A1A),
          showSelectedLabels: false,
          showUnselectedLabels: false,
          backgroundColor: Colors.white,
          type: BottomNavigationBarType.fixed,
        ),
      ),
    );
  }
} 