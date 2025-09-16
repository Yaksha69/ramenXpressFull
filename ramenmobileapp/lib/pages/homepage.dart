import 'package:flutter/material.dart';
import '../services/cart_service.dart';
import '../services/menu_service.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../services/notification_counter_service.dart';
import '../services/global_notification_service.dart';
import '../models/menu_item.dart';

import 'payment_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with TickerProviderStateMixin {
  String selectedCategory = 'All';
  final TextEditingController _searchController = TextEditingController();
  String searchQuery = '';

  // Services
  final CartService _cartService = CartService();
  final MenuService _menuService = MenuService();
  final ApiService _apiService = ApiService();

  // Local cart state
  int cartItemCount = 0;
  
  // Menu state
  List<MenuItem> _menuItems = [];
  bool _isLoading = true;

  // Add-ons state
  List<MenuItem> _addOns = [];

  // User profile state
  String userName = 'User';
  bool _isLoadingProfile = true;

  // Sweet Alert state
  late AnimationController _alertController;
  late Animation<double> _alertScaleAnimation;
  late Animation<double> _alertOpacityAnimation;

  @override
  void initState() {
    super.initState();
    _loadCart();
    _loadMenuItems();
    _loadAddOns();
    _loadUserProfile();
    
    // Set socket context for notifications
    SocketService().setContext(context);
    SocketService().connect(); // Ensure socket is connected
    
    // Set up global socket listener for notifications
    SocketService().onOrderStatusUpdate = (data) {
      print('📱 Homepage received order update: $data');
      // Update notification counter when order status updates
      NotificationCounterService().incrementUnreadCount();
      
      // Add notification to global service
      _addNotificationToGlobalService(data);
    };
    
    // Initialize alert animations
    _alertController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _alertScaleAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _alertController,
      curve: Curves.elasticOut,
    ));
    _alertOpacityAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _alertController,
      curve: Curves.easeInOut,
    ));
  }

  void _addNotificationToGlobalService(Map<String, dynamic> data) {
    final orderId = data['orderId']?.toString() ?? '';
    final status = data['status']?.toString() ?? '';
    final order = data['order'] as Map<String, dynamic>?;
    
    if (orderId.isEmpty || status.isEmpty) return;

    final deliveryMethod = order?['deliveryMethod']?.toString() ?? '';
    final isPickup = deliveryMethod.toLowerCase() == 'pickup';
    
    String title = '';
    String message = '';
    IconData icon = Icons.notifications;
    Color color = const Color(0xFF2196F3);
    
    switch (status.toLowerCase()) {
      case 'preparing':
        title = 'Order Being Prepared';
        message = 'Your order #$orderId is now being prepared by our kitchen!';
        icon = Icons.restaurant_menu;
        color = const Color(0xFFFF9800);
        break;
      case 'ready':
        title = isPickup ? 'Ready for Pickup!' : 'Order Ready';
        message = isPickup 
          ? 'Your order #$orderId is ready for pickup!'
          : 'Your order #$orderId is ready for delivery!';
        icon = Icons.check_circle;
        color = const Color(0xFF4CAF50);
        break;
      case 'out for delivery':
      case 'outfordelivery':
        title = 'Out for Delivery';
        message = 'Your order #$orderId is on its way to you!';
        icon = Icons.delivery_dining;
        color = const Color(0xFF2196F3);
        break;
      case 'delivered':
        title = isPickup ? 'Order Picked Up!' : 'Order Delivered!';
        message = isPickup 
          ? 'Thank you for picking up your order #$orderId!'
          : 'Your order #$orderId has been delivered. Enjoy your meal!';
        icon = Icons.done_all;
        color = const Color(0xFF4CAF50);
        break;
      case 'cancelled':
        title = 'Order Cancelled';
        message = 'Your order #$orderId has been cancelled.';
        icon = Icons.cancel;
        color = const Color(0xFFD32D43);
        break;
      default:
        title = 'Order Update';
        message = 'Your order #$orderId status has been updated to $status.';
        icon = Icons.info;
        color = const Color(0xFF2196F3);
    }

    final notification = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'title': title,
      'message': message,
      'time': _formatNotificationTime(DateTime.now()),
      'type': 'order',
      'isRead': false,
      'icon': icon,
      'color': color,
      'orderId': orderId,
      'status': status,
      'createdAt': DateTime.now(),
    };

    GlobalNotificationService().addNotification(notification);
  }

  String _formatNotificationTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} minutes ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hours ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return 'MMM dd, yyyy';
    }
  }

  @override
  void dispose() {
    _alertController.dispose();
    super.dispose();
  }

  void _showSweetAlertMessage(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      builder: (BuildContext context) {
        return AnimatedBuilder(
          animation: _alertController,
          builder: (context, child) {
            return Opacity(
              opacity: _alertOpacityAnimation.value,
              child: Center(
                child: Transform.scale(
                  scale: _alertScaleAnimation.value,
                  child: Container(
                    margin: const EdgeInsets.all(40),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.check_circle,
                          color: Color(0xFFD32D43),
                          size: 48,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          message,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Color(0xFF1A1A1A),
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.none,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
    
    _alertController.forward();
    
    // Auto-hide after 2 seconds
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        _alertController.reverse().then((_) {
          Navigator.of(context).pop();
        });
      }
    });
  }

  Future<void> _loadCart() async {
    await _cartService.loadCart();
    setState(() {
      cartItemCount = _cartService.itemCount;
    });
  }

  Future<void> _loadMenuItems() async {
    setState(() {
      _isLoading = true;
    });

    try {
      print('🔍 Loading menu items for category: $selectedCategory');
      final items = await _menuService.getMenuItemsByCategory(selectedCategory);
      print('✅ Loaded ${items.length} items for category: $selectedCategory');
      setState(() {
        _menuItems = items;
        _isLoading = false;
      });
    } catch (e) {
      print('❌ Error loading menu items for category $selectedCategory: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _searchMenuItems() async {
    if (searchQuery.isEmpty) {
      await _loadMenuItems();
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final items = await _menuService.searchMenuItems(searchQuery);
      setState(() {
        _menuItems = items.where((item) => 
          selectedCategory == 'All' || item.category == selectedCategory
        ).toList();
        _isLoading = false;
      });
    } catch (e) {
      print('Error searching menu items: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadAddOns() async {
    try {
      print('🔍 Loading add-ons...');
      final addOns = await _menuService.getMenuItemsByCategory('add-ons');
      print('✅ Loaded ${addOns.length} add-ons');
      for (var addon in addOns) {
        print('  - ${addon.name}: ₱${addon.price}');
      }
      setState(() {
        _addOns = addOns;
      });
    } catch (e) {
      print('❌ Error loading add-ons: $e');
    }
  }

  Future<void> _loadUserProfile() async {
    try {
      setState(() {
        _isLoadingProfile = true;
      });
      
      await _apiService.loadToken();
      final response = await _apiService.getCustomerProfile();
      final customerData = response['data'] ?? response;
      
      setState(() {
        userName = '${customerData['firstName'] ?? ''} ${customerData['lastName'] ?? ''}'.trim();
        if (userName.isEmpty) {
          userName = 'User';
        }
        _isLoadingProfile = false;
      });
    } catch (e) {
      print('❌ Error loading user profile: $e');
      setState(() {
        userName = 'User';
        _isLoadingProfile = false;
      });
    }
  }

  List<MenuItem> get filteredMenuItems {
    // Exclude add-ons from the main menu list
    return _menuItems.where((item) => item.category.toLowerCase() != 'add-ons').toList();
  }

  Widget _buildMenuItemImage(String imagePath, {double? width, double? height}) {
    final imageUrl = ApiService.getImageUrl(imagePath);
    final isNetwork = ApiService.isNetworkImage(imagePath);
    
    if (isNetwork) {
      return Image.network(
        imageUrl,
        width: width,
        height: height,
        fit: BoxFit.fill,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: width ?? 80,
            height: height ?? 80,
            color: Colors.grey[200],
            child: const Icon(
              Icons.image_not_supported,
            ),
          );
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            width: width ?? 80,
            height: height ?? 80,
            color: Colors.grey[200],
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          );
        },
      );
    } else {
      return Image.asset(
        imageUrl,
        width: width,
        height: height,
        fit: BoxFit.fill,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: width ?? 80,
            height: height ?? 80,
            color: Colors.grey[200],
            child: const Icon(
              Icons.image_not_supported,
            ),
          );
        },
      );
    }
  }

  Future<void> addToCart(
    Map<String, dynamic> item,
    List<Map<String, dynamic>> selectedAddOns,
  ) async {
    final menuItem = MenuItem(
      name: item['name'],
      price: item['price'].toDouble(),
      image: item['image'],
      category: item['category'],
    );
    
    final addOns = selectedAddOns.map(
      (addon) => AddOn(name: addon['name'], price: addon['price'].toDouble())
    ).toList();
    
    final removedIngredients = item['removedIngredients'] as List<String>? ?? [];
    
    await _cartService.addToCart(menuItem, addOns, removedIngredients: removedIngredients);
    setState(() {
      cartItemCount = _cartService.itemCount;
    });
  }

  void _showAddOnsModal(BuildContext context, MenuItem item) {
    List<Map<String, dynamic>> selectedAddOns = [];
    List<String> removedIngredients = [];
    double totalPrice = item.price;
    
    print('🔍 Opening modal for: ${item.name}');
    print('📦 Current add-ons count: ${_addOns.length}');
    for (var addon in _addOns) {
      print('  - ${addon.name}: ₱${addon.price}');
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      enableDrag: true,
      isDismissible: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(
                        0xFFD32D43,
                      ).withAlpha((0.08 * 255).toInt()),
                      spreadRadius: 1,
                      blurRadius: 10,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Customize Your Order',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                      color: const Color(0xFF1A1A1A),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Item details
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFD32D43),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: _buildMenuItemImage(item.image, width: 80, height: 80),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: Color(0xFF1A1A1A),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '₱${totalPrice.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      color: Color(0xFF1A1A1A),
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      
                      // Remove Ingredients section
                      const Text(
                        'Remove Ingredients',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Tap ingredients you want to remove from your ${item.name}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // Ingredients removal list
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey[200]!),
                        ),
                        child: item.ingredients.isEmpty 
                          ? const Padding(
                              padding: EdgeInsets.all(16.0),
                              child: Text(
                                'No ingredients available for removal',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey,
                                  fontStyle: FontStyle.italic,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            )
                          : Column(
                              children: item.ingredients.map((ingredient) {
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 4),
                                  decoration: BoxDecoration(
                                    color: removedIngredients.contains(ingredient.name) 
                                        ? Colors.red[50] 
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: CheckboxListTile(
                                    value: removedIngredients.contains(ingredient.name),
                                    onChanged: (bool? value) {
                                      setState(() {
                                        if (value == true) {
                                          removedIngredients.add(ingredient.name);
                                        } else {
                                          removedIngredients.remove(ingredient.name);
                                        }
                                      });
                                    },
                                    title: Row(
                                      children: [
                                        Icon(
                                          Icons.remove_circle_outline,
                                          size: 16,
                                          color: removedIngredients.contains(ingredient.name) 
                                              ? Colors.red 
                                              : Colors.grey,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            ingredient.name,
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: removedIngredients.contains(ingredient.name) 
                                                  ? Colors.red[700] 
                                                  : Colors.black87,
                                              decoration: removedIngredients.contains(ingredient.name) 
                                                  ? TextDecoration.lineThrough 
                                                  : null,
                                            ),
                                          ),
                                        ),
                                        if (ingredient.quantity > 0)
                                          Text(
                                            '${ingredient.quantity} ${ingredient.unit}',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey,
                                            ),
                                          ),
                                      ],
                                    ),
                                    controlAffinity: ListTileControlAffinity.leading,
                                    dense: true,
                                    activeColor: const Color(0xFFD32D43),
                                  ),
                                );
                              }).toList(),
                            ),
                      ),
                      
                      const SizedBox(height: 20),
                      
                      // Add-ons section
                      const Text(
                        'Add Extras',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _addOns.isNotEmpty 
                          ? 'Available add-ons: ${_addOns.length}'
                          : 'Using default add-ons (${_addOns.isNotEmpty ? _addOns.length : 4})',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Show add-ons or fallback add-ons if none are loaded
                      ...(_addOns.isNotEmpty ? _addOns : [
                        MenuItem(
                          id: 'fallback1',
                          name: 'Extra Egg',
                          price: 20.0,
                          image: 'assets/side1.jpg',
                          category: 'add-ons',
                        ),
                        MenuItem(
                          id: 'fallback2',
                          name: 'Extra Noodles',
                          price: 30.0,
                          image: 'assets/side2.jpg',
                          category: 'add-ons',
                        ),
                        MenuItem(
                          id: 'fallback3',
                          name: 'Extra Chashu',
                          price: 50.0,
                          image: 'assets/side3.jpg',
                          category: 'add-ons',
                        ),
                        MenuItem(
                          id: 'fallback4',
                          name: 'Extra Seaweed',
                          price: 15.0,
                          image: 'assets/side4.jpg',
                          category: 'add-ons',
                        ),
                      ]).map((addOn) {
                        bool isSelected = selectedAddOns.any(
                          (a) => a['name'] == addOn.name,
                        );
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: CheckboxListTile(
                            value: isSelected,
                            onChanged: (bool? value) {
                              setState(() {
                                if (value == true) {
                                  selectedAddOns.add({
                                    'name': addOn.name,
                                    'price': addOn.price,
                                  });
                                  totalPrice += addOn.price;
                                } else {
                                  selectedAddOns.removeWhere(
                                    (a) => a['name'] == addOn.name,
                                  );
                                  totalPrice -= addOn.price;
                                }
                              });
                            },
                            title: Text(
                              addOn.name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            subtitle: Text(
                              '₱${addOn.price.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Color(0xFF1A1A1A),
                                fontSize: 12,
                              ),
                            ),
                            activeColor: const Color(0xFFD32D43),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
              // Bottom action bar
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withValues(
                        red: 128,
                        green: 128,
                        blue: 128,
                        alpha: 10,
                      ),
                      spreadRadius: 1,
                      blurRadius: 10,
                      offset: const Offset(0, -1),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Total Price',
                            style: TextStyle(
                              fontSize: 14,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                          Text(
                            '₱${totalPrice.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    TweenAnimationBuilder(
                      tween: Tween<double>(begin: 1.0, end: 1.0),
                      duration: const Duration(milliseconds: 100),
                      builder: (context, scale, child) {
                        return GestureDetector(
                          onTapDown: (_) {
                            // Animate scale down
                            (context as Element).markNeedsBuild();
                          },
                          onTapUp: (_) async {
                            await addToCart({
                              'name': item.name,
                              'price': item.price,
                              'image': item.image,
                              'category': item.category,
                              'removedIngredients': removedIngredients,
                            }, selectedAddOns);
                            if (context.mounted) {
                              Navigator.pop(context);
                              String customizationText = '';
                              if (removedIngredients.isNotEmpty || selectedAddOns.isNotEmpty) {
                                customizationText = ' (customized)';
                              }
                              _showSweetAlertMessage('${item.name}$customizationText added to cart');
                            }
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 100),
                            transform: Matrix4.identity()..scale(scale, scale),
                            curve: Curves.easeInOut,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFD32D43), Color(0xFFFE6854)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color.fromARGB(255, 255, 208, 214),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 16,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.shopping_cart,
                                  color: Colors.white,
                                  size: 22,
                                ),
                                const SizedBox(width: 10),
                                const Text(
                                  'Add to Cart',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },

                      child: const Text(
                        'Add to Cart',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            automaticallyImplyLeading: false,
            floating: false,
            pinned: true,
            expandedHeight: 120,
            backgroundColor: Colors.white,
            elevation: 0,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFFD32D43),
                      Color(0xFFE85A4F),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 15),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _isLoadingProfile ? 'Hello! 👋' : 'Hello $userName! 👋',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'RamenXpress',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Stack(
                                    children: [
                                      IconButton(
                                        onPressed: () {
                                          Navigator.pushNamed(context, '/notifications');
                                        },
                                        icon: const Icon(
                                          Icons.notifications_outlined,
                                          color: Colors.white,
                                          size: 24,
                                        ),
                                      ),
                                      ListenableBuilder(
                                        listenable: NotificationCounterService(),
                                        builder: (context, child) {
                                          return NotificationCounterService().hasUnreadNotifications
                                              ? Positioned(
                                                  right: 8,
                                                  top: 8,
                                                  child: Container(
                                                    width: 10,
                                                    height: 10,
                                                    decoration: const BoxDecoration(
                                                      color: Colors.white,
                                                      shape: BoxShape.circle,
                                                    ),
                                                  ),
                                                )
                                              : const SizedBox.shrink();
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.1),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  padding: const EdgeInsets.all(2),
                                  child: const CircleAvatar(
                                    backgroundImage: AssetImage('assets/adminPIC.png'),
                                    radius: 20,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Modern Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          spreadRadius: 0,
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search for your favorite ramen...',
                        hintStyle: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 16,
                          fontWeight: FontWeight.w400,
                        ),
                        prefixIcon: Container(
                          margin: const EdgeInsets.all(12),
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: const Color(0xFFD32D43).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.search,
                            color: Color(0xFFD32D43),
                            size: 20,
                          ),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(
                            color: Color(0xFFD32D43),
                            width: 2,
                          ),
                        ),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
                        ),
                      ),
                      onChanged: (value) {
                        setState(() {
                          searchQuery = value;
                        });
                        Future.delayed(const Duration(milliseconds: 500), () {
                          if (mounted) {
                            _searchMenuItems();
                          }
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Categories Section
                  const Text(
                    'Categories',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A1A1A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _menuService.categories.map((category) {
                        bool isSelected = selectedCategory == category;
                        return Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: isSelected
                                  ? const LinearGradient(
                                      colors: [Color(0xFFD32D43), Color(0xFFE85A4F)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    )
                                  : null,
                              color: isSelected ? null : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: isSelected
                                      ? const Color(0xFFD32D43).withOpacity(0.3)
                                      : Colors.black.withOpacity(0.04),
                                  spreadRadius: 0,
                                  blurRadius: isSelected ? 12 : 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    selectedCategory = category;
                                  });
                                  _loadMenuItems();
                                },
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 24,
                                    vertical: 12,
                                  ),
                                  child: Text(
                                    category,
                                    style: TextStyle(
                                      color: isSelected
                                          ? Colors.white
                                          : const Color(0xFF1A1A1A),
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Menu Items Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Popular Menu',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A1A),
                          letterSpacing: -0.3,
                        ),
                      ),
                      TextButton(
                        onPressed: () {},
                        child: const Text(
                          'View All',
                          style: TextStyle(
                            color: Color(0xFFD32D43),
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _isLoading
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: Color(0xFFD32D43),
                          ),
                        )
                      : filteredMenuItems.isEmpty
                          ? const Center(
                              child: Text(
                                'No items found',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey,
                                ),
                              ),
                            )
                          : GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                childAspectRatio: 0.75,
                                crossAxisSpacing: 16,
                                mainAxisSpacing: 20,
                              ),
                              itemCount: filteredMenuItems.length,
                              itemBuilder: (context, index) {
                                final item = filteredMenuItems[index];
                                return Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.06),
                                        spreadRadius: 0,
                                        blurRadius: 12,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      onTap: () {
                                        _showAddOnsModal(context, item);
                                      },
                                      borderRadius: BorderRadius.circular(20),
                                      child: Padding(
                                        padding: const EdgeInsets.all(12),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Expanded(
                                              flex: 3,
                                              child: Container(
                                                width: double.infinity,
                                                decoration: BoxDecoration(
                                                  borderRadius: BorderRadius.circular(16),
                                                  color: Colors.grey[50],
                                                ),
                                                child: ClipRRect(
                                                  borderRadius: BorderRadius.circular(16),
                                                  child: _buildMenuItemImage(
                                                    item.image,
                                                    width: double.infinity,
                                                  ),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(height: 12),
                                            Expanded(
                                              flex: 2,
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    item.name,
                                                    style: const TextStyle(
                                                      fontWeight: FontWeight.w700,
                                                      fontSize: 15,
                                                      color: Color(0xFF1A1A1A),
                                                      letterSpacing: -0.2,
                                                    ),
                                                    maxLines: 2,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                  const SizedBox(height: 8),
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      Text(
                                                        '₱${item.price.toStringAsFixed(2)}',
                                                        style: const TextStyle(
                                                          color: Color(0xFFD32D43),
                                                          fontSize: 16,
                                                          fontWeight: FontWeight.w700,
                                                          letterSpacing: 0.2,
                                                        ),
                                                      ),
                                                      Container(
                                                        width: 32,
                                                        height: 32,
                                                        decoration: BoxDecoration(
                                                          gradient: const LinearGradient(
                                                            colors: [Color(0xFFD32D43), Color(0xFFE85A4F)],
                                                            begin: Alignment.topLeft,
                                                            end: Alignment.bottomRight,
                                                          ),
                                                          borderRadius: BorderRadius.circular(10),
                                                          boxShadow: [
                                                            BoxShadow(
                                                              color: const Color(0xFFD32D43).withOpacity(0.3),
                                                              blurRadius: 8,
                                                              offset: const Offset(0, 2),
                                                            ),
                                                          ],
                                                        ),
                                                        child: const Icon(
                                                          Icons.add,
                                                          color: Colors.white,
                                                          size: 18,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              spreadRadius: 0,
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: BottomNavigationBar(
              currentIndex: 0,
              onTap: (index) {
                switch (index) {
                  case 0:
                    break;
                  case 1:
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const PaymentPage()),
                    );
                    break;
                  case 2:
                    Navigator.pushNamed(context, '/order-history');
                    break;
                  case 3:
                    Navigator.pushNamed(context, '/profile');
                    break;
                }
              },
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.home_outlined),
                  activeIcon: Icon(Icons.home),
                  label: '',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.shopping_cart_outlined),
                  activeIcon: Icon(Icons.shopping_cart),
                  label: '',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.history_outlined),
                  activeIcon: Icon(Icons.history),
                  label: '',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline),
                  activeIcon: Icon(Icons.person),
                  label: '',
                ),
              ],
              selectedItemColor: const Color(0xFFD32D43),
              unselectedItemColor: Colors.grey[400],
              showSelectedLabels: false,
              showUnselectedLabels: false,
              backgroundColor: Colors.transparent,
              type: BottomNavigationBarType.fixed,
              elevation: 0,
            ),
          ),
        ),
      ),
    );
  }
}
