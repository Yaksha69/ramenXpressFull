import 'package:flutter/material.dart';
import '../services/cart_service.dart';
import '../services/menu_service.dart';
import '../services/api_service.dart';
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

  // Local cart state
  int cartItemCount = 0;
  
  // Menu state
  List<MenuItem> _menuItems = [];
  bool _isLoading = true;

  // Add-ons state
  List<MenuItem> _addOns = [];

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
      final items = await _menuService.getMenuItemsByCategory(selectedCategory);
      setState(() {
        _menuItems = items;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading menu items: $e');
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
    // Convert to MenuItem and AddOn objects
    final menuItem = MenuItem(
      name: item['name'],
      price: item['price'].toDouble(),
      image: item['image'],
      category: item['category'],
    );
    
    final addOns = selectedAddOns.map((addon) => 
      AddOn(name: addon['name'], price: addon['price'].toDouble())
    ).toList();
    
    await _cartService.addToCart(menuItem, addOns);
    setState(() {
      cartItemCount = _cartService.itemCount;
    });
  }

  void _showAddOnsModal(BuildContext context, MenuItem item) {
    List<Map<String, dynamic>> selectedAddOns = [];
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
                      // Add-ons section
                      const Text(
                        'Add-ons',
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
                            }, selectedAddOns);
                            if (context.mounted) {
                              Navigator.pop(context);
                              _showSweetAlertMessage('${item.name} added to cart');
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
      body: Stack(
        children: [
          CustomScrollView(
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
                      'RamenXpress',
                      style: TextStyle(
                        color: Color(0xFF1A1A1A),
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    Stack(
                      children: [
                        IconButton(
                          onPressed: () {
                            Navigator.pushNamed(context, '/notifications');
                          },
                          icon: const Icon(
                            Icons.notifications_none,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                        // Show notification badge if there are unread notifications
                        // You can replace this with actual unread notification count
                        if (true) // Change this to check for unread notifications
                          Positioned(
                            right: 8,
                            top: 8,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Color(0xFFD32D43),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 8),
                    const CircleAvatar(
                      backgroundImage: AssetImage('assets/adminPIC.png'),
                      radius: 20,
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search Bar
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search for your favorite ramen...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                    ),
                    onChanged: (value) {
                      setState(() {
                        searchQuery = value;
                      });
                      // Debounce search
                      Future.delayed(const Duration(milliseconds: 500), () {
                        if (mounted) {
                          _searchMenuItems();
                        }
                      });
                    },
                  ),
                  const SizedBox(height: 24),

                  // Categories
                  const Text(
                    'Categories',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children:
                          _menuService.categories.map(
                            (category) {
                              bool isSelected = selectedCategory == category;
                              return Padding(
                                padding: const EdgeInsets.only(right: 12),
                                child: FilterChip(
                                  label: Text(category),
                                  selected: isSelected,
                                  onSelected: (selected) {
                                    setState(() {
                                      selectedCategory = category;
                                    });
                                    _loadMenuItems();
                                  },
                                  selectedColor: const Color(0xFFD32D43),
                                  checkmarkColor: Colors.white,
                                  labelStyle: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : const Color(0xFF1A1A1A),
                                  ),
                                ),
                              );
                            },
                          ).toList(),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Menu Items
                  const Text(
                    'Menu',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 16),
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
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.8,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                    itemCount: filteredMenuItems.length,
                    itemBuilder: (context, index) {
                      final item = filteredMenuItems[index];
                      return Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.grey[300]!),
                        ),
                        child: InkWell(
                                    splashColor: const Color(0x1AD32D43),
                          highlightColor: Colors.transparent,
                          onTap: () {
                            _showAddOnsModal(context, item);
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(12),
                                  ),
                                  child: _buildMenuItemImage(item.image, width: double.infinity),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: Color(0xFF1A1A1A),
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '₱${item.price.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        color: Color(0xFFD32D43),
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
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
      ],
    ),
    bottomNavigationBar: Container(
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
        child: BottomNavigationBar(
          currentIndex: 0,
          onTap: (index) {
            switch (index) {
              case 0:
                // Already on home page
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
            BottomNavigationBarItem(icon: Icon(Icons.home), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.shopping_cart), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.history), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.person), label: ''),
          ],
          selectedItemColor: const Color(0xFFD32D43),
          unselectedItemColor: const Color(0xFF1A1A1A),
          showSelectedLabels: false,
          showUnselectedLabels: false,
          backgroundColor: Colors.white,
          type: BottomNavigationBarType.fixed,
        ),
      ),
      floatingActionButton: null,
    );
  }
}
