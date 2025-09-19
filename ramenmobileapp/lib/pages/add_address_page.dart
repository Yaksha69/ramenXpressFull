import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../models/delivery_address.dart';
import '../widgets/address_dropdown_widget.dart';

class AddAddressPage extends StatefulWidget {
  const AddAddressPage({super.key});

  @override
  State<AddAddressPage> createState() => _AddAddressPageState();
}

class _AddAddressPageState extends State<AddAddressPage> {
  final _formKey = GlobalKey<FormState>();
  final _recipientNameController = TextEditingController();
  final _recipientMobileController = TextEditingController();
  final _streetController = TextEditingController();
  final _zipCodeController = TextEditingController();
  
  String? selectedProvince;
  String? selectedCity;
  String? selectedBarangay;
  bool _isDefault = false;

  @override
  void dispose() {
    _recipientNameController.dispose();
    _recipientMobileController.dispose();
    _streetController.dispose();
    _zipCodeController.dispose();
    super.dispose();
  }

  void _onAddressChanged(String province, String city, String barangay) {
    setState(() {
      selectedProvince = province;
      selectedCity = city;
      selectedBarangay = barangay;
    });
  }

  void _saveAddress() {
    if (_formKey.currentState!.validate()) {
      if (selectedProvince == null || selectedCity == null || selectedBarangay == null) {
        NotificationService.showError(context, 'Please select province, city, and barangay');
        return;
      }

      final addressData = {
        'recipientName': _recipientNameController.text.trim(),
        'recipientMobile': _recipientMobileController.text.trim(),
        'street': _streetController.text.trim(),
        'barangay': selectedBarangay!,
        'municipality': selectedCity!,
        'province': selectedProvince!,
        'zipCode': _zipCodeController.text.trim(),
        'isDefault': _isDefault,
      };

      Navigator.of(context).pop(addressData);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Add New Address',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: const Color(0xFFD32D43),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Recipient Information
              const Text(
                'Recipient Information',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _recipientNameController,
                decoration: InputDecoration(
                  labelText: 'Recipient Full Name',
                  hintText: 'Enter recipient full name',
                  prefixIcon: const Icon(Icons.person),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter recipient name';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              TextFormField(
                controller: _recipientMobileController,
                decoration: InputDecoration(
                  labelText: 'Mobile Number',
                  hintText: 'Enter mobile number',
                  prefixIcon: const Icon(Icons.phone),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter mobile number';
                  }
                  if (!RegExp(r'^[0-9+\-\s()]+$').hasMatch(value)) {
                    return 'Please enter a valid mobile number';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // Address Form
              const Text(
                'Address Details',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _streetController,
                decoration: InputDecoration(
                  labelText: 'Street Address',
                  hintText: 'Enter street address',
                  prefixIcon: const Icon(Icons.home),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter street address';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              // Address Dropdown Widget
              AddressDropdownWidget(
                onAddressChanged: _onAddressChanged,
              ),

              const SizedBox(height: 16),

              TextFormField(
                controller: _zipCodeController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'ZIP Code',
                  hintText: 'Enter ZIP code',
                  prefixIcon: const Icon(Icons.local_post_office),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter ZIP code';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 20),

              // Default Address Switch
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: SwitchListTile(
                  title: const Text(
                    'Set as default address',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: const Text('Use this address as your primary delivery location'),
                  value: _isDefault,
                  onChanged: (value) {
                    setState(() {
                      _isDefault = value;
                    });
                  },
                  activeColor: const Color(0xFFD32D43),
                ),
              ),

              const SizedBox(height: 32),

              // Save Button
              SizedBox(
                width: double.infinity,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFD32D43), Color(0xFFE85A4F)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFD32D43).withOpacity(0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: _saveAddress,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Save Address',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
