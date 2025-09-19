import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../services/api_service.dart';
import '../models/delivery_address.dart';
import '../widgets/address_dropdown_widget.dart';
import 'add_address_page.dart';

class AddressPage extends StatefulWidget {
  const AddressPage({super.key});

  @override
  State<AddressPage> createState() => _AddressPageState();
}

class _AddressPageState extends State<AddressPage> {
  List<DeliveryAddress> _addresses = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchAddresses();
  }

  Future<void> _fetchAddresses() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final api = ApiService();
      final addresses = await api.getDeliveryAddresses();
      setState(() {
        _addresses = addresses;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _addAddress() async {
    final newAddress = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(builder: (context) => const AddAddressPage()),
    );
    if (newAddress != null && mounted) {
      try {
        final api = ApiService();
        await api.createDeliveryAddressFromMap(newAddress);
        await _fetchAddresses(); // Refresh from backend
        if (mounted) {
          NotificationService.showSuccess(context, 'Address added successfully');
        }
      } catch (e) {
        if (mounted) {
          NotificationService.showError(context, 'Failed to add address: $e');
        }
      }
    }
  }

  Future<void> _editAddress(DeliveryAddress address) async {
    final editedAddress = await Navigator.of(context).push<DeliveryAddress>(
      MaterialPageRoute(
        builder: (context) => EditAddressPage(address: address),
      ),
    );
    if (editedAddress != null && context.mounted) {
      setState(() {
        final index = _addresses.indexWhere((a) => a.id == address.id);
        if (index != -1) {
          _addresses[index] = editedAddress;
        }
      });
      // Refresh the address list but stay on this page
      await _fetchAddresses();
    }
  }

  Future<void> _deleteAddress(DeliveryAddress address) async {
    if (!context.mounted) return;
    final confirmed = await NotificationService.showConfirmDialog(
      context: context,
      title: 'Delete Address',
      message: 'Are you sure you want to delete this address?\n\n${address.fullAddress}',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: Colors.red,
    );

    if (confirmed == true && context.mounted) {
      try {
        // Show loading
        NotificationService.showLoadingDialog(context, message: 'Deleting address...');
        
        // Call API to delete address from backend
        final api = ApiService();
        await api.deleteDeliveryAddress(address.id);
        
        // Hide loading
        NotificationService.hideLoadingDialog(context);
        
        if (context.mounted) {
          NotificationService.showSuccess(context, 'Address deleted successfully');
          // Refresh the address list from backend
          await _fetchAddresses();
        }
      } catch (e) {
        // Hide loading
        NotificationService.hideLoadingDialog(context);
        
        if (context.mounted) {
          NotificationService.showError(context, 'Failed to delete address: $e');
        }
      }
    }
  }

  Future<void> _setDefaultAddress(DeliveryAddress address) async {
    try {
      // Call API to set default address on backend
      final api = ApiService();
      await api.setDefaultDeliveryAddress(address.id);
      
      NotificationService.showSuccess(context, 'Default address updated');
      
      // Refresh the address list from backend
      await _fetchAddresses();
    } catch (e) {
      NotificationService.showError(context, 'Failed to update default address: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () async {
            // Refresh the current page data before going back
            await _fetchAddresses();
            Navigator.pop(context, true); // Pass true to indicate refresh needed
          },
        ),
        title: const Text(
          'Delivery Addresses',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!, style: TextStyle(color: Colors.red)))
              : _addresses.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.visibility_off,
                            size: 80,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 24),
                          const Text(
                            'No delivery addresses yet',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w500,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Add a delivery address to get started',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _addresses.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 16),
                      itemBuilder: (context, index) {
                        final address = _addresses[index];
                        return Card(
                          elevation: 3,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: InkWell(
                            onTap: () => _setDefaultAddress(address),
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    Icons.location_on,
                                    color: Colors.red,
                                    size: 32,
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            if (address.isDefault)
                                              Container(
                                                padding: const EdgeInsets.symmetric(
                                                  horizontal: 8,
                                                  vertical: 4,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: const Color.fromARGB(255, 255, 235, 235),
                                                  borderRadius: BorderRadius.circular(12),
                                                ),
                                                child: const Text(
                                                  'Default',
                                                  style: TextStyle(
                                                    color: Colors.red,
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ),
                                            const SizedBox(width: 8),
                                            const Text(
                                              'Home',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 16,
                                                color: Colors.red,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          address.recipientName,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          address.recipientMobile,
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.grey[700],
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          address.fullAddress,
                                          style: const TextStyle(fontSize: 15),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Tap to set as default',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[600],
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit, color: Colors.grey),
                                        onPressed: () => _editAddress(address),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete, color: Colors.grey),
                                        onPressed: () => _deleteAddress(address),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addAddress,
        backgroundColor: Colors.red,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      backgroundColor: Colors.white,
    );
  }
}

class EditAddressPage extends StatefulWidget {
  final DeliveryAddress address;
  
  const EditAddressPage({super.key, required this.address});

  @override
  State<EditAddressPage> createState() => _EditAddressPageState();
}

class _EditAddressPageState extends State<EditAddressPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController recipientNameController;
  late final TextEditingController recipientMobileController;
  late final TextEditingController streetController;
  late final TextEditingController zipController;
  
  String? selectedProvince;
  String? selectedCity;
  String? selectedBarangay;

  @override
  void initState() {
    super.initState();
    recipientNameController = TextEditingController(text: widget.address.recipientName);
    recipientMobileController = TextEditingController(text: widget.address.recipientMobile);
    streetController = TextEditingController(text: widget.address.street);
    zipController = TextEditingController(text: widget.address.zipCode);
    
    // Initialize dropdown selections
    selectedProvince = widget.address.province;
    selectedCity = widget.address.municipality;
    selectedBarangay = widget.address.barangay;
  }

  @override
  void dispose() {
    recipientNameController.dispose();
    recipientMobileController.dispose();
    streetController.dispose();
    zipController.dispose();
    super.dispose();
  }

  void _onAddressChanged(String province, String city, String barangay) {
    setState(() {
      selectedProvince = province;
      selectedCity = city;
      selectedBarangay = barangay;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Address'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Recipient Name
                TextFormField(
                  controller: recipientNameController,
                  decoration: InputDecoration(
                    labelText: 'Recipient Full Name',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Recipient name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Recipient Mobile Number
                TextFormField(
                  controller: recipientMobileController,
                  decoration: InputDecoration(
                    labelText: 'Mobile Number',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  keyboardType: TextInputType.phone,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Mobile number is required';
                    }
                    if (!RegExp(r'^[0-9+\-\s()]+$').hasMatch(value)) {
                      return 'Please enter a valid mobile number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // House/Building Number & Street Name
                TextFormField(
                  controller: streetController,
                  decoration: InputDecoration(
                    labelText: 'House/Building Number & Street Name',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'House/Building & Street is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Address Dropdown Widget
                AddressDropdownWidget(
                  initialCity: selectedCity,
                  initialBarangay: selectedBarangay,
                  onAddressChanged: _onAddressChanged,
                ),
                const SizedBox(height: 14),

                // ZIP/Postal Code
                TextFormField(
                  controller: zipController,
                  decoration: InputDecoration(
                    labelText: 'ZIP/Postal Code',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'ZIP/Postal Code is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: () {
                      if (_formKey.currentState!.validate()) {
                        if (selectedProvince == null || selectedCity == null || selectedBarangay == null) {
                          NotificationService.showError(context, 'Please select province, city, and barangay');
                          return;
                        }
                        
                        final editedAddress = DeliveryAddress(
                          id: widget.address.id,
                          recipientName: recipientNameController.text.trim(),
                          recipientMobile: recipientMobileController.text.trim(),
                          street: streetController.text.trim(),
                          barangay: selectedBarangay!,
                          municipality: selectedCity!,
                          province: selectedProvince!,
                          zipCode: zipController.text.trim(),
                          isDefault: widget.address.isDefault,
                        );
                        Navigator.of(context).pop(editedAddress);
                      }
                    },
                    child: const Text('Save Changes', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      backgroundColor: Colors.white,
    );
  }
}