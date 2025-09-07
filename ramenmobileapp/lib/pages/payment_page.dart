import 'package:flutter/material.dart';
import 'invoice_page.dart';
import '../services/cart_service.dart';
import '../services/order_service.dart';
import '../services/api_service.dart';
import '../services/menu_service.dart';
import '../models/cart_item.dart';
import '../models/menu_item.dart';
import '../models/delivery_address.dart';
import '../models/payment_method.dart';
import 'edit_payment_method_page.dart';
import 'paymentmethod_page.dart';

class PaymentPage extends StatefulWidget {
  final Map<String, dynamic>? orderData;
  
  const PaymentPage({super.key, this.orderData});

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  String selectedDeliveryMethod = 'Pickup';
  PaymentMethod? selectedPaymentMethod;
  DeliveryAddress? selectedAddress;
  final TextEditingController _notesController = TextEditingController();
  
  // Services
  final CartService _cartService = CartService();
  final OrderService _orderService = OrderService();
  final ApiService _apiService = ApiService();
  final MenuService _menuService = MenuService();
  List<MenuItem> _addOns = [];

  // API Data
  List<DeliveryAddress> deliveryAddresses = [];
  List<PaymentMethod> paymentMethods = [];
  bool isLoading = true;

  // Use order data if provided, otherwise use cart service
  List<Map<String, dynamic>> get cartItems {
    if (widget.orderData != null && widget.orderData!['items'] != null) {
      return List<Map<String, dynamic>>.from(widget.orderData!['items']);
    }
    
    // Convert CartService items to the format expected by the UI
    return _cartService.cartItems.map((cartItem) => {
      'name': cartItem.menuItem.name,
      'price': cartItem.menuItem.price,
      'image': cartItem.menuItem.image,
      'quantity': cartItem.quantity,
      'addons': cartItem.selectedAddOns.map((addon) => {
        'name': addon.name,
        'price': addon.price,
      }).toList(),
    }).toList();
  }



  void removeItem(String name) {
    setState(() {
      _cartService.removeFromCart(name);
    });
  }

  Widget _buildItemImage(String imagePath) {
    final imageUrl = ApiService.getImageUrl(imagePath);
    final isNetwork = ApiService.isNetworkImage(imagePath);
    
    if (isNetwork) {
      return Image.network(
        imageUrl,
        fit: BoxFit.fill,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Colors.grey[200],
            child: const Icon(
              Icons.image_not_supported,
            ),
          );
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
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
        fit: BoxFit.fill,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Colors.grey[200],
            child: const Icon(
              Icons.image_not_supported,
            ),
          );
        },
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _loadData();
    _loadAddOns();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      isLoading = true;
    });

    try {
      // Load cart data
    await _cartService.loadCart();
      
      // Load delivery addresses and payment methods from API
      await Future.wait([
        _loadDeliveryAddresses(),
        _loadPaymentMethods(),
      ]);
    } catch (e) {
      print('Error loading data: $e');
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  Future<void> _loadDeliveryAddresses() async {
    try {
      print('🔍 Loading delivery addresses...');
      deliveryAddresses = await _apiService.getDeliveryAddresses();
      print('✅ Loaded ${deliveryAddresses.length} delivery addresses');
      
      // Set default address if available, safely
      if (deliveryAddresses.isNotEmpty) {
        final defaultAddress = deliveryAddresses.where((a) => a.isDefault).toList();
        if (defaultAddress.isNotEmpty) {
          selectedAddress = defaultAddress.first;
        } else {
          selectedAddress = deliveryAddresses.first;
        }
        print('📍 Selected address: ${selectedAddress!.fullAddress}');
      } else {
        selectedAddress = null;
        print('⚠️ No delivery addresses found');
      }
    } catch (e) {
      print('❌ Error loading delivery addresses: $e');
      deliveryAddresses = [];
      // Show user-friendly error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load delivery addresses: $e'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  Future<void> _loadPaymentMethods() async {
    try {
      print('🔍 Loading payment methods...');
      paymentMethods = await _apiService.getPaymentMethods();
      print('✅ Loaded ${paymentMethods.length} payment methods');
      
      // Do not auto-select any payment method; let the customer choose
      selectedPaymentMethod = null;
      if (paymentMethods.isEmpty) {
        print('⚠️ No payment methods found');
      }
    } catch (e) {
      print('❌ Error loading payment methods: $e');
      paymentMethods = [];
      // Show user-friendly error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load payment methods: $e'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  Future<void> _loadAddOns() async {
    try {
      final addOns = await _menuService.getMenuItemsByCategory('add-ons');
      setState(() {
        _addOns = addOns;
      });
    } catch (e) {
      print('❌ Error loading add-ons: $e');
    }
  }

  void showEditItemModal(Map<String, dynamic> item) {
    int tempQuantity = item['quantity'];
    List<Map<String, dynamic>> tempAddons = List<Map<String, dynamic>>.from(item['addons'] ?? []);
    PaymentMethod? tempPaymentMethod = selectedPaymentMethod;
    DeliveryAddress? tempAddress = selectedAddress;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            double tempItemTotal = (item['price'] * tempQuantity) + 
                (tempAddons.fold(0.0, (sum, addon) => sum + addon['price']) * tempQuantity);
            
            return Container(
              height: MediaQuery.of(context).size.height * 0.8,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.grey.withValues(red: 128, green: 128, blue: 128, alpha: 10),
                                spreadRadius: 1,
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: _buildItemImage(item['image']),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item['name'],
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1A1A1A),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '₱${item['price'].toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 18,
                                  color: Color(0xFFD32D43),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const Divider(height: 1),
                  
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Quantity',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            GestureDetector(
                              onTap: () {
                                if (tempQuantity > 1) {
                                  setModalState(() {
                                    tempQuantity--;
                                  });
                                }
                              },
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: tempQuantity > 1 
                                      ? const Color(0xFFD32D43) 
                                      : Colors.grey.shade300,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Icon(
                                  Icons.remove,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 32),
                              child: Text(
                                '$tempQuantity',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1A1A1A),
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: () {
                                setModalState(() {
                                  tempQuantity++;
                                });
                              },
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFD32D43),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Icon(
                                  Icons.add,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  const Divider(height: 1),
                  
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Add-ons',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Expanded(
                            child: ListView.builder(
                              itemCount: _addOns.length,
                              itemBuilder: (context, index) {
                                final addon = _addOns[index];
                                final isSelected = tempAddons.any((a) => a['name'] == addon.name);
                                
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  decoration: BoxDecoration(
                                    color: isSelected 
                                        ? const Color.fromARGB(255, 255, 233, 236)
                                        : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isSelected 
                                          ? const Color(0xFFD32D43)
                                          : const Color(0xFFE9ECEF),
                                      width: 1,
                                    ),
                                  ),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 8,
                                    ),
                                    leading: Icon(
                                      isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                                      color: isSelected 
                                          ? const Color(0xFFD32D43)
                                          : Colors.grey,
                                      size: 24,
                                    ),
                                    title: Text(
                                      addon.name,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: isSelected 
                                            ? FontWeight.bold 
                                            : FontWeight.normal,
                                        color: const Color(0xFF1A1A1A),
                                      ),
                                    ),
                                    subtitle: Text(
                                      '+₱${addon.price.toStringAsFixed(0)}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: Color(0xFFD32D43),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    onTap: () {
                                      setModalState(() {
                                        if (isSelected) {
                                          tempAddons.removeWhere((a) => a['name'] == addon.name);
                                        } else {
                                          tempAddons.add({'name': addon.name, 'price': addon.price});
                                        }
                                      });
                                    },
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const Divider(height: 1),
                  
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total:',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            Text(
                              '₱${tempItemTotal.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFD32D43),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () {
                                  removeItem(item['name']);
                                  Navigator.pop(context);
                                },
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Color(0xFFD32D43)),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text(
                                  'Remove Item',
                                  style: TextStyle(
                                    color: Color(0xFFD32D43),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () {
                                  Navigator.pop(context);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFD32D43),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text(
                                  'Update Item',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  double get subtotal {
    return cartItems.fold(
      0.0,
      (sum, item) {
        double addonsTotal = 0.0;
        if (item['addons'] != null) {
          for (var addon in item['addons']) {
            addonsTotal += (addon['price'] as double) * item['quantity'];
          }
        }
        return sum + (item['price'] * item['quantity']) + addonsTotal;
      },
    );
  }

  double get shippingFee => selectedDeliveryMethod == 'Delivery' ? 50.0 : 0.0;
  double get total => subtotal + shippingFee;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            color: Color(0xFFD32D43),
          ),
        ),
      );
    }

    if (cartItems.isEmpty) {
      return Scaffold(
        bottomNavigationBar: _buildBottomNavBar(),
        body: CustomScrollView(
          slivers: [
            _buildAppBar(),
            SliverFillRemaining(
              child: Center(
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
                      'Your cart is empty',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Looks like you haven\'t added anything to your cart yet',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: () =>
                          Navigator.pushReplacementNamed(context, '/home'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD32D43),
                        padding: const EdgeInsets.symmetric(
                          vertical: 16,
                          horizontal: 32,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Start Shopping'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      bottomNavigationBar: _buildBottomNavBar(),
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ...cartItems.map(
                    (item) => _cartItem(
                      item['name'],
                      item['price'],
                      item['image'],
                      item['quantity'].toString(),
                      item['addons'] ?? [],
                      () => showEditItemModal(item),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Delivery Method
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.grey,
                          spreadRadius: 1,
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color.fromARGB(255, 255, 235, 235),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.delivery_dining,
                                color: Color(0xFFD32D43),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Text(
                              'Delivery Method',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() => selectedDeliveryMethod = 'Pickup');
                                },
                                child: Container(
                                  height: 60,
                                  decoration: BoxDecoration(
                                    color: selectedDeliveryMethod == 'Pickup'
                                        ? const Color(0xFFD32D43)
                                        : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: selectedDeliveryMethod == 'Pickup'
                                          ? const Color(0xFFD32D43)
                                          : const Color(0xFFE9ECEF),
                                      width: 2,
                                    ),
                                    boxShadow: selectedDeliveryMethod == 'Pickup'
                                        ? [
                                            BoxShadow(
                                              color: const Color.fromARGB(255, 255, 235, 235),
                                              spreadRadius: 1,
                                              blurRadius: 8,
                                              offset: const Offset(0, 4),
                                            ),
                                          ]
                                        : [
                                            BoxShadow(
                                              color: const Color.fromARGB(255, 255, 235, 235),
                                              spreadRadius: 1,
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            ),
                                          ],
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.store,
                                        size: 24,
                                        color: selectedDeliveryMethod == 'Pickup'
                                            ? Colors.white
                                            : const Color(0xFFD32D43),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Pickup',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: selectedDeliveryMethod == 'Pickup'
                                              ? Colors.white
                                              : const Color(0xFF1A1A1A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() => selectedDeliveryMethod = 'Delivery');
                                },
                                child: Container(
                                  height: 60,
                                  decoration: BoxDecoration(
                                    color: selectedDeliveryMethod == 'Delivery'
                                        ? const Color(0xFFD32D43)
                                        : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: selectedDeliveryMethod == 'Delivery'
                                          ? const Color(0xFFD32D43)
                                          : const Color(0xFFE9ECEF),
                                      width: 2,
                                    ),
                                    boxShadow: selectedDeliveryMethod == 'Delivery'
                                        ? [
                                            BoxShadow(
                                              color: const Color.fromARGB(255, 255, 229, 229),
                                              spreadRadius: 1,
                                              blurRadius: 8,
                                              offset: const Offset(0, 4),
                                            ),
                                          ]
                                        : [
                                            BoxShadow(
                                              color: const Color.fromARGB(255, 201, 201, 201),
                                              spreadRadius: 1,
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            ),
                                          ],
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.delivery_dining,
                                        size: 24,
                                        color: selectedDeliveryMethod == 'Delivery'
                                            ? Colors.white
                                            : const Color(0xFFD32D43),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Delivery',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: selectedDeliveryMethod == 'Delivery'
                                              ? Colors.white
                                              : const Color(0xFF1A1A1A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  if (selectedDeliveryMethod == 'Delivery') ...[
                    const Text(
                      'Delivery Address',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (deliveryAddresses.isNotEmpty) ...[
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFE9ECEF),
                            width: 1,
                          ),
                        ),
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color.fromARGB(255, 255, 235, 235),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.location_on,
                                color: Color(0xFFD32D43),
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    selectedAddress?.fullAddress ?? 'Select a delivery address',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1A1A1A),
                                    ),
                                  ),
                                  if (selectedAddress != null && selectedAddress!.isDefault)
                                    const Text(
                                      'Default',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            PopupMenuButton<DeliveryAddress>(
                              icon: const Icon(
                                Icons.arrow_drop_down,
                                color: Color(0xFFD32D43),
                              ),
                              onSelected: (DeliveryAddress address) {
                                setState(() {
                                  selectedAddress = address;
                                });
                              },
                              itemBuilder: (BuildContext context) {
                                return deliveryAddresses.map((DeliveryAddress address) {
                                  return PopupMenuItem<DeliveryAddress>(
                                    value: address,
                                    child: Row(
                                      children: [
                                        Icon(Icons.location_on, size: 20, color: address.isDefault ? Color(0xFFD32D43) : Colors.grey),
                                        const SizedBox(width: 8),
                                        Expanded(child: Text(address.fullAddress)),
                                        if (address.isDefault)
                                          const Padding(
                                            padding: EdgeInsets.only(left: 8.0),
                                            child: Chip(
                                              label: Text('Default'),
                                              backgroundColor: Color(0xFFD32D43),
                                              labelStyle: TextStyle(color: Colors.white, fontSize: 10),
                                            ),
                                          ),
                                      ],
                                    ),
                                  );
                                }).toList();
                              },
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFE9ECEF),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color.fromARGB(255, 255, 235, 235),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.location_on,
                                color: Color(0xFFD32D43),
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'No delivery addresses',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1A1A1A),
                                    ),
                                  ),
                                  Text(
                                    'Add a delivery address to continue',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: () async {
                          final result = await Navigator.pushNamed(context, '/address');
                          if (result == true) {
                            // Refresh delivery addresses in payment page
                            await _loadDeliveryAddresses();
                            setState(() {
                              // Trigger UI update with new addresses
                            });
                          }
                        },
                        icon: const Icon(Icons.add, color: Color(0xFFD32D43)),
                        label: const Text(
                          'Add New Delivery Address',
                          style: TextStyle(color: Color(0xFFD32D43)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Payment Method Section
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color.fromARGB(255, 221, 221, 221),
                          spreadRadius: 1,
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color.fromARGB(255, 255, 235, 235),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.account_balance_wallet,
                                color: Color(0xFFD32D43),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Text(
                              'Payment Method',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (paymentMethods.isNotEmpty) ...[
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8F9FA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFE9ECEF),
                                width: 1,
                              ),
                            ),
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color.fromARGB(255, 255, 235, 235),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    selectedPaymentMethod?.icon ?? Icons.account_balance_wallet,
                                    color: const Color(0xFFD32D43),
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        selectedPaymentMethod?.title ?? 'Select a payment method',
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF1A1A1A),
                                        ),
                                      ),
                                      Text(
                                        selectedPaymentMethod?.displayName ?? '',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                PopupMenuButton<PaymentMethod>(
                                  icon: const Icon(
                                    Icons.arrow_drop_down,
                                    color: Color(0xFFD32D43),
                                  ),
                                  onSelected: (PaymentMethod method) {
                                    setState(() {
                                      selectedPaymentMethod = method;
                                    });
                                  },
                                  itemBuilder: (BuildContext context) {
                                    return paymentMethods.map((PaymentMethod method) {
                                      return PopupMenuItem<PaymentMethod>(
                                        value: method,
                                        child: Row(
                                          children: [
                                            Icon(method.icon, size: 20),
                                            const SizedBox(width: 8),
                                            Text(method.title),
                                          ],
                                        ),
                                      );
                                    }).toList();
                                  },
                                ),
                              ],
                            ),
                          ),
                        ] else ...[
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F9FA),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFFE9ECEF),
                              width: 1,
                            ),
                          ),
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color.fromARGB(255, 255, 235, 235),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.account_balance_wallet,
                                  color: Color(0xFFD32D43),
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                        'No payment methods',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF1A1A1A),
                                      ),
                                    ),
                                    Text(
                                        'Add a payment method to continue',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        ],
                        const SizedBox(height: 12),
                        TextButton.icon(
                          onPressed: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const PaymentmethodPage(),
                              ),
                            );
                            await _loadPaymentMethods();
                          },
                          icon: const Icon(Icons.add, color: Color(0xFFD32D43)),
                          label: const Text(
                            'Add New Payment Method',
                            style: TextStyle(color: Color(0xFFD32D43)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Order Notes
                  const Text(
                    'Order Notes (optional)',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notesController,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: 'Add a note to your order...',
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 24),

                  // Summary
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color.fromARGB(255, 158, 158, 158),
                          spreadRadius: 1,
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color.fromARGB(255, 255, 235, 235),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.receipt_long,
                                color: Color(0xFFD32D43),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Text(
                              'Order Summary',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Subtotal',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            Text(
                              '₱${subtotal.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Shipping Fee',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            Text(
                              '₱${shippingFee.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            Text(
                              '₱${total.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFD32D43),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Proceed Button
                  Container(
                    width: double.infinity,
                    height: 56,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFD32D43), Color(0xFFB71C1C)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color.fromARGB(255, 255, 235, 235),
                          spreadRadius: 1,
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: () async {
                        try {
                          // Validate delivery method and address
                          if (selectedDeliveryMethod == 'Delivery' && selectedAddress == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please select a delivery address'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          // Validate payment method
                          if (paymentMethods.isNotEmpty && selectedPaymentMethod == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please select a payment method'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          // Debug: Print cart items structure
                          print('🔍 Cart items structure:');
                          for (int i = 0; i < cartItems.length; i++) {
                            print('📦 Item $i: ${cartItems[i]}');
                          }
                          
                          // Convert cart items to CartItem objects for OrderService
                          final cartItemObjects = cartItems.map((item) {
                            final menuItem = MenuItem(
                              id: item['id'] ?? '1', // Add ID field
                              name: item['name'],
                              price: item['price'].toDouble(),
                              image: item['image'],
                              category: 'Unknown', // We don't have category in cart items
                            );
                            
                            final addOns = (item['addons'] as List<dynamic>?)?.map((addon) => 
                              AddOn(name: addon['name'], price: addon['price'].toDouble())
                            ).toList() ?? [];
                            
                            return CartItem(
                              menuItem: menuItem,
                              quantity: item['quantity'],
                              selectedAddOns: addOns,
                            );
                          }).toList();

                          // Create order using OrderService
                          final order = await _orderService.createOrder(
                            items: cartItemObjects,
                            deliveryMethod: selectedDeliveryMethod,
                            deliveryAddress: selectedDeliveryMethod == 'Delivery' && selectedAddress != null
                                ? '${selectedAddress!.street}, ${selectedAddress!.barangay}, ${selectedAddress!.municipality}, ${selectedAddress!.province}, ${selectedAddress!.zipCode}'
                                : null,
                            paymentMethod: selectedPaymentMethod?.title ?? 'Cash',
                            notes: _notesController.text,
                          );

                          // Clear cart after successful order
                          await _cartService.clearCart();

                          // Navigate to invoice page
                          if (!context.mounted) return;
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => InvoicePage(order: order.toJson()),
                            ),
                          );
                          // Refresh the page to show updated cart
                          if (mounted) {
                            setState(() {});
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Error processing order: $e'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.payment,
                            color: Colors.white,
                            size: 20,
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Proceed to Payment',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _cartItem(
    String name,
    double price,
    String image,
    String quantity,
    List<Map<String, dynamic>> addons,
    VoidCallback onRemove,
  ) {
    double addonsTotal = addons.fold(0.0, (sum, addon) => sum + addon['price']);
    double itemTotal = (price * int.parse(quantity)) + (addonsTotal * int.parse(quantity));

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color.fromARGB(255, 156, 156, 156),
            spreadRadius: 1,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: const Color.fromARGB(255, 149, 149, 149),
                        spreadRadius: 1,
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: _buildItemImage(image),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '₱${price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          color: Color(0xFFD32D43),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF6F0EE),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'Qty: $quantity',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '₱${itemTotal.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: onRemove,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color.fromARGB(255, 255, 235, 235),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.edit_outlined,
                              size: 18,
                              color: Color(0xFFD32D43),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (addons.isNotEmpty)
                      Text(
                        '${addons.length} add-on${addons.length > 1 ? 's' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          if (addons.isNotEmpty)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16.0),
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFFE9ECEF),
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.add_circle_outline,
                        size: 16,
                        color: Color(0xFFD32D43),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'Add-ons',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...addons.map((addon) => Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '• ${addon['name']}',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                        Text(
                          '+₱${addon['price'].toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFFD32D43),
                          ),
                        ),
                      ],
                    ),
                  ))
                ],
              ),
            ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
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
                'Payment',
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
    );
  }

  Widget _buildBottomNavBar() {
    return Container(
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
        currentIndex: 1,
        onTap: (index) {
          switch (index) {
            case 0:
              Navigator.pushNamed(context, '/home');
              break;
            case 1:
              // Already on payment page
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
        selectedItemColor: Color(0xFFD32D43),
        unselectedItemColor: Color(0xFF1A1A1A),
        showSelectedLabels: false,
        showUnselectedLabels: false,
        backgroundColor: Colors.white,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
} 