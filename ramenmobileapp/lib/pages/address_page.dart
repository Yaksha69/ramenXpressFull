import 'package:flutter/material.dart';
import '../models/delivery_address.dart';
import '../services/api_service.dart';

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
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Address added successfully'),
              backgroundColor: Colors.green,
            ),
          );
          // Refresh the address list but stay on this page
          await _fetchAddresses();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to add address: $e'),
              backgroundColor: Colors.red,
            ),
          );
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
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Address'),
        content: Text('Are you sure you want to delete this address?\n\n${address.fullAddress}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      setState(() {
        _addresses.removeWhere((a) => a.id == address.id);
        // If we deleted the default address and there are other addresses, make the first one default
        if (address.isDefault && _addresses.isNotEmpty) {
          _addresses.first.isDefault = true;
        }
      });
      
      if (context.mounted) {
        // ignore: use_build_context_synchronously
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Address deleted successfully'),
            backgroundColor: Colors.green,
          ),
        );
        // Refresh the address list but stay on this page
        await _fetchAddresses();
      }
    }
  }

  Future<void> _setDefaultAddress(DeliveryAddress address) async {
    setState(() {
      // Remove default from all addresses
      for (var addr in _addresses) {
        addr.isDefault = false;
      }
      // Set the selected address as default
      address.isDefault = true;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Default address updated'),
        backgroundColor: Colors.green,
      ),
    );
    
    // Refresh the address list but stay on this page
    await _fetchAddresses();
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

class AddAddressPage extends StatefulWidget {
  const AddAddressPage({super.key});

  @override
  State<AddAddressPage> createState() => _AddAddressPageState();
}

class _AddAddressPageState extends State<AddAddressPage> {
  final _formKey = GlobalKey<FormState>();
  final houseStreetController = TextEditingController();
  final barangayController = TextEditingController();
  final cityController = TextEditingController();
  final provinceController = TextEditingController();
  final zipController = TextEditingController();
  bool isDefault = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Delivery Address'),
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
                // House/Building Number & Street Name
                TextFormField(
                  controller: houseStreetController,
                  decoration: InputDecoration(
                    labelText: 'House/Building Number & Street Name',
                    hintText: '#123 Marasigan St.',
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

                // Barangay/Subdivision
                TextFormField(
                  controller: barangayController,
                  decoration: InputDecoration(
                    labelText: 'Barangay/Subdivision',
                    hintText: 'Barangay Poblacion 5',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Barangay/Subdivision is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // City/Municipality
                TextFormField(
                  controller: cityController,
                  decoration: InputDecoration(
                    labelText: 'City/Municipality',
                    hintText: 'Calaca City',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'City/Municipality is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Province
                TextFormField(
                  controller: provinceController,
                  decoration: InputDecoration(
                    labelText: 'Province',
                    hintText: 'Batangas',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Province is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // ZIP/Postal Code
                TextFormField(
                  controller: zipController,
                  decoration: InputDecoration(
                    labelText: 'ZIP/Postal Code',
                    hintText: 'e.g., 4208',
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
                const SizedBox(height: 14),

                Row(
                  children: [
                    Checkbox(
                      value: isDefault,
                      onChanged: (val) => setState(() => isDefault = val ?? false),
                      activeColor: Colors.red,
                    ),
                    const Text('Set as default address'),
                  ],
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
                        final addressData = {
                          'street': houseStreetController.text.trim(),
                          'barangay': barangayController.text.trim(),
                          'municipality': cityController.text.trim(),
                          'province': provinceController.text.trim(),
                          'zipCode': zipController.text.trim(),
                          'isDefault': isDefault,
                        };
                        Navigator.of(context).pop(addressData);
                      }
                    },
                    child: const Text('Save', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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

class EditAddressPage extends StatefulWidget {
  final DeliveryAddress address;
  
  const EditAddressPage({super.key, required this.address});

  @override
  State<EditAddressPage> createState() => _EditAddressPageState();
}

class _EditAddressPageState extends State<EditAddressPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController streetController;
  late final TextEditingController barangayController;
  late final TextEditingController municipalityController;
  late final TextEditingController provinceController;
  late final TextEditingController zipController;

  @override
  void initState() {
    super.initState();
    streetController = TextEditingController(text: widget.address.street);
    barangayController = TextEditingController(text: widget.address.barangay);
    municipalityController = TextEditingController(text: widget.address.municipality);
    provinceController = TextEditingController(text: widget.address.province);
    zipController = TextEditingController(text: widget.address.zipCode);
  }

  @override
  void dispose() {
    streetController.dispose();
    barangayController.dispose();
    municipalityController.dispose();
    provinceController.dispose();
    zipController.dispose();
    super.dispose();
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

                // Barangay/Subdivision
                TextFormField(
                  controller: barangayController,
                  decoration: InputDecoration(
                    labelText: 'Barangay/Subdivision',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Barangay/Subdivision is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // City/Municipality
                TextFormField(
                  controller: municipalityController,
                  decoration: InputDecoration(
                    labelText: 'City/Municipality',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'City/Municipality is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Province
                TextFormField(
                  controller: provinceController,
                  decoration: InputDecoration(
                    labelText: 'Province',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Province is required';
                    }
                    return null;
                  },
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
                        final editedAddress = DeliveryAddress(
                          id: widget.address.id,
                          street: streetController.text.trim(),
                          barangay: barangayController.text.trim(),
                          municipality: municipalityController.text.trim(),
                          province: provinceController.text.trim(),
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