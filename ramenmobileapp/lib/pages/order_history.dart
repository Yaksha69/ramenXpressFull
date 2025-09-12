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

class _OrderHistoryPageState extends State<OrderHistoryPage> with WidgetsBindingObserver, TickerProviderStateMixin {
  final OrderService _orderService = OrderService();
  List<Order> orders = [];
  List<Order> filteredOrders = [];
  bool isLoading = true;
  
  late TabController _tabController;
  int _selectedTabIndex = 0;
  
  final List<String> _tabLabels = ['All', 'Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];
  final List<String> _statusFilters = ['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabLabels.length, vsync: this);
    _tabController.addListener(_onTabChanged);
    WidgetsBinding.instance.addObserver(this);
    SocketService().connect();
    SocketService().onOrderStatusUpdate = (data) {
      print('📱 Order status update received in history: $data');
      
      // Force refresh from API to get latest data
      _loadOrders(forceRefresh: true);
      
      // Show a notification about the status change
      if (mounted && data['status'] != null) {
        final orderId = data['order']?['orderId'] ?? data['orderId'] ?? 'Unknown';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order #$orderId status updated to ${data['status']}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    };
    _loadOrders();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Force refresh when returning to this page to get latest data
    _loadOrders(forceRefresh: true);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      // Force refresh when app comes back to foreground
      _loadOrders(forceRefresh: true);
    }
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    setState(() {
      _selectedTabIndex = _tabController.index;
      _filterOrders();
    });
  }

  void _filterOrders() {
    final selectedFilter = _statusFilters[_selectedTabIndex];
    if (selectedFilter == 'all') {
      filteredOrders = orders;
    } else {
      filteredOrders = orders.where((order) => 
        order.status.toString().split('.').last.toLowerCase() == selectedFilter
      ).toList();
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    // Clean up socket listener
    SocketService().onOrderStatusUpdate = null;
    super.dispose();
  }

  Future<void> _loadOrders({bool forceRefresh = false}) async {
    await ApiService().loadToken();
    await _orderService.loadOrders(forceRefresh: forceRefresh);
    setState(() {
      orders = _orderService.orders;
      _filterOrders();
      isLoading = false;
    });
  }

  Future<void> _refreshOrders() async {
    setState(() {
      isLoading = true;
    });
    await ApiService().loadToken();
    await _loadOrders(forceRefresh: true);
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

  Widget _buildMenuItemImageWithName(String imagePath, String itemName, {double? width, double? height}) {
    print('🖼️ ORDER HISTORY DEBUG:');
    print('  Original path: "$imagePath"');
    print('  Item name: "$itemName"');
    
    // Try multiple image loading strategies
    return Container(
      width: width ?? 50,
      height: height ?? 50,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Colors.grey[200],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: _buildImageWithFallbacks(imagePath, itemName, width: width, height: height),
      ),
    );
  }

  Widget _buildImageWithFallbacks(String imagePath, String itemName, {double? width, double? height}) {
    // If we have an image path from the database, use it
    if (imagePath.isNotEmpty) {
      final baseUrl = ApiService.baseUrl.replaceAll('/api/v1', '');
      final imageUrl = '$baseUrl/uploads/menus/$imagePath';
      
      print('  Loading stored image: $imageUrl');
      
      return Image.network(
        imageUrl,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          print('🔴 Stored image failed: $imageUrl');
          print('🔴 Error: $error');
          return _loadMenuItemFromAPI(itemName, width: width, height: height);
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) {
            print('✅ Stored image loaded successfully: $imageUrl');
            return child;
          }
          return Container(
            width: width ?? 50,
            height: height ?? 50,
            color: Colors.grey[200],
            child: const Center(
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          );
        },
      );
    }
    
    // If no image path in database, try to get from API
    return _loadMenuItemFromAPI(itemName, width: width, height: height);
  }

  Widget _loadMenuItemFromAPI(String itemName, {double? width, double? height}) {
    print('  Fetching menu item from API for: $itemName');
    
    return FutureBuilder<String?>(
      future: _getMenuItemImage(itemName),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Container(
            width: width ?? 50,
            height: height ?? 50,
            color: Colors.grey[200],
            child: const Center(
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          );
        }
        
        if (snapshot.hasData && snapshot.data!.isNotEmpty) {
          final baseUrl = ApiService.baseUrl.replaceAll('/api/v1', '');
          final imageUrl = '$baseUrl/uploads/menus/${snapshot.data}';
          
          print('  Loading API image: $imageUrl');
          
          return Image.network(
            imageUrl,
            width: width,
            height: height,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              print('🔴 API image failed: $imageUrl');
              return Container(
                width: width ?? 50,
                height: height ?? 50,
                color: Colors.grey[200],
                child: Icon(
                  Icons.restaurant,
                  color: Colors.grey[400],
                  size: 24,
                ),
              );
            },
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) {
                print('✅ API image loaded successfully: $imageUrl');
                return child;
              }
              return Container(
                width: width ?? 50,
                height: height ?? 50,
                color: Colors.grey[200],
                child: const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              );
            },
          );
        }
        
        // No image found, show placeholder
        return Container(
          width: width ?? 50,
          height: height ?? 50,
          color: Colors.grey[200],
          child: Icon(
            Icons.restaurant,
            color: Colors.grey[400],
            size: 24,
          ),
        );
      },
    );
  }

  Future<String?> _getMenuItemImage(String itemName) async {
    try {
      final allMenuItems = await ApiService().getMenuItems();
      final matchingItem = allMenuItems.firstWhere(
        (item) => item.name.toLowerCase() == itemName.toLowerCase(),
        orElse: () => throw Exception('Menu item not found'),
      );
      return matchingItem.image;
    } catch (e) {
      print('🔴 Error fetching menu item image: $e');
      return null;
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
            expandedHeight: 180,
            backgroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: Colors.white,
                padding: const EdgeInsets.only(top: 60, left: 16, right: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
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
                    const SizedBox(height: 20),
                    // Modern Tab Bar
                    Container(
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: TabBar(
                        controller: _tabController,
                        isScrollable: true,
                        indicator: BoxDecoration(
                          color: const Color(0xFFD32D43),
                          borderRadius: BorderRadius.circular(25),
                        ),
                        labelColor: Colors.white,
                        unselectedLabelColor: Colors.grey[600],
                        labelStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        unselectedLabelStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        tabs: _tabLabels.map((label) => Tab(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(label),
                          ),
                        )).toList(),
                      ),
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
                : filteredOrders.isEmpty
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
                            Text(
                              _selectedTabIndex == 0 ? 'No orders yet' : 'No ${_tabLabels[_selectedTabIndex].toLowerCase()} orders',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _selectedTabIndex == 0 
                                ? 'Your order history will appear here'
                                : 'No orders found for this status',
                              style: const TextStyle(
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
                                _selectedTabIndex == 0 ? 'All Orders' : '${_tabLabels[_selectedTabIndex]} Orders',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1A1A1A),
                                ),
                              ),
                            ),
                            ...filteredOrders.map((order) {
                              final orderId = order.id.length > 4
                                  ? order.id.substring(order.id.length - 4)
                                  : order.id.padLeft(4, '0');
                              return Card(
                                margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
                                elevation: 2,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(12),
                                  splashColor: Color(0x1AD32D43),
                                  highlightColor: Colors.transparent,
                                  onTap: () {
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
                                            Text(
                                              'Order #$orderId',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 16,
                                                color: Color(0xFF1A1A1A),
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              decoration: BoxDecoration(
                                                color: _getStatusColor(order.status.name).withAlpha((0.08 * 255).toInt()),
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                order.status.name.toUpperCase(),
                                                style: TextStyle(
                                                  color: _getStatusColor(order.status.name),
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        
                                        ...order.items.take(3).map((item) {
                                          return Container(
                                            margin: const EdgeInsets.only(bottom: 8),
                                            child: Row(
                                              children: [
                                                _buildMenuItemImageWithName(item.menuItem.image, item.menuItem.name, width: 50, height: 50),
                                                const SizedBox(width: 12),
                                                
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Text(
                                                        item.menuItem.name,
                                                        style: const TextStyle(
                                                          fontWeight: FontWeight.w600,
                                                          fontSize: 14,
                                                          color: Color(0xFF1A1A1A),
                                                        ),
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                      const SizedBox(height: 2),
                                                      Text(
                                                        'x${item.quantity}',
                                                        style: TextStyle(
                                                          fontSize: 12,
                                                          color: Colors.grey[600],
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                
                                                Text(
                                                  currencyFormat.format(item.totalPrice),
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 14,
                                                    color: Color(0xFF1A1A1A),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          );
                                        }).toList(),
                                        
                                        if (order.items.length > 3)
                                          Container(
                                            margin: const EdgeInsets.only(bottom: 8),
                                            child: Text(
                                              '+${order.items.length - 3} more items',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey[600],
                                                fontStyle: FontStyle.italic,
                                              ),
                                            ),
                                          ),
                                        
                                        const Divider(height: 20),
                                        
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'Total ${order.items.length} item${order.items.length > 1 ? 's' : ''}',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    color: Colors.grey[600],
                                                  ),
                                                ),
                                                Text(
                                                  dateFormat.format(order.orderDate),
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    color: Colors.grey[600],
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Text(
                                              currencyFormat.format(order.total),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 18,
                                                color: Color(0xFFD32D43),
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