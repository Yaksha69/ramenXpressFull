import 'package:flutter/material.dart';
import '../data/batangas_addresses.dart';

class AddressDropdownWidget extends StatefulWidget {
  final String? initialCity;
  final String? initialBarangay;
  final Function(String province, String city, String barangay) onAddressChanged;

  const AddressDropdownWidget({
    super.key,
    this.initialCity,
    this.initialBarangay,
    required this.onAddressChanged,
  });

  @override
  State<AddressDropdownWidget> createState() => _AddressDropdownWidgetState();
}

class _AddressDropdownWidgetState extends State<AddressDropdownWidget> {
  String selectedProvince = 'Batangas';
  String? selectedCity;
  String? selectedBarangay;
  
  List<String> cities = [];
  List<String> barangays = [];

  @override
  void initState() {
    super.initState();
    cities = BatangasAddresses.getMunicipalities();
    
    // Initialize with provided values
    if (widget.initialCity != null) {
      selectedCity = widget.initialCity;
      barangays = BatangasAddresses.getBarangays(selectedCity!);
      
      if (widget.initialBarangay != null) {
        selectedBarangay = widget.initialBarangay;
      }
    }
  }


  void _onCityChanged(String? city) {
    setState(() {
      selectedCity = city;
      selectedBarangay = null;
      barangays = city != null ? BatangasAddresses.getBarangays(city) : [];
    });
    _notifyChange();
  }

  void _onBarangayChanged(String? barangay) {
    setState(() {
      selectedBarangay = barangay;
    });
    _notifyChange();
  }

  void _notifyChange() {
    if (selectedCity != null && selectedBarangay != null) {
      widget.onAddressChanged(selectedProvince, selectedCity!, selectedBarangay!);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Province Display (Fixed to Batangas)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
            color: Colors.grey[50],
          ),
          child: Row(
            children: [
              const Icon(Icons.location_city, color: Colors.grey),
              const SizedBox(width: 12),
              Text(
                'Province: Batangas',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[700],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // City/Municipality Dropdown
        DropdownButtonFormField<String>(
          value: selectedCity,
          decoration: InputDecoration(
            labelText: 'City/Municipality',
            prefixIcon: const Icon(Icons.location_on),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            filled: true,
            fillColor: Colors.grey[100],
          ),
          items: cities.map((city) {
            return DropdownMenuItem<String>(
              value: city,
              child: Text(city),
            );
          }).toList(),
          onChanged: _onCityChanged,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please select a city/municipality';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),

        // Barangay Dropdown
        DropdownButtonFormField<String>(
          value: selectedBarangay,
          decoration: InputDecoration(
            labelText: 'Barangay',
            prefixIcon: const Icon(Icons.place),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            filled: true,
            fillColor: Colors.grey[100],
          ),
          items: barangays.map((barangay) {
            return DropdownMenuItem<String>(
              value: barangay,
              child: Text(barangay),
            );
          }).toList(),
          onChanged: selectedCity != null ? _onBarangayChanged : null,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please select a barangay';
            }
            return null;
          },
        ),
      ],
    );
  }
}
