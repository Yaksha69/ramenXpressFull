import 'package:flutter/material.dart';
import '../models/payment_method.dart';

class EditPaymentMethodPage extends StatefulWidget {
  final Map<String, dynamic>? paymentMethod;

  const EditPaymentMethodPage({super.key, this.paymentMethod});

  @override
  State<EditPaymentMethodPage> createState() => _EditPaymentMethodPageState();
}

class _EditPaymentMethodPageState extends State<EditPaymentMethodPage> {
  final _formKey = GlobalKey<FormState>();
  PaymentType _selectedType = PaymentType.gcash;
  final _titleController = TextEditingController();
  final _accountNumberController = TextEditingController();
  bool _isDefault = false;

  @override
  void initState() {
    super.initState();
    if (widget.paymentMethod != null) {
      _selectedType = widget.paymentMethod!['type'] ?? PaymentType.gcash;
      _titleController.text = widget.paymentMethod!['title'] ?? '';
      _accountNumberController.text =
          widget.paymentMethod!['accountNumber'] ?? '';
      _isDefault = widget.paymentMethod!['isDefault'] ?? false;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _accountNumberController.dispose();
    super.dispose();
  }

  void _savePaymentMethod() {
    if (_formKey.currentState!.validate()) {
      // In static version, just pop with result
      Navigator.pop(context, {
        'type': _selectedType,
        'title': _titleController.text,
        'accountNumber': _accountNumberController.text,
        'isDefault': _isDefault,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.paymentMethod == null
              ? 'Add Payment Method'
              : 'Edit Payment Method',
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Payment Type',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              SegmentedButton<PaymentType>(
                segments: const [
                  ButtonSegment<PaymentType>(
                    value: PaymentType.gcash,
                    label: Text('GCash'),
                    icon: Icon(Icons.account_balance_wallet),
                  ),
                  ButtonSegment<PaymentType>(
                    value: PaymentType.maya,
                    label: Text('Maya'),
                    icon: Icon(Icons.account_balance),
                  ),
                ],
                selected: {_selectedType},
                onSelectionChanged: (Set<PaymentType> selected) {
                  setState(() {
                    _selectedType = selected.first;
                  });
                },
                style: ButtonStyle(
                  backgroundColor: WidgetStateProperty.resolveWith<Color>(
                    (Set<WidgetState> states) {
                      if (states.contains(WidgetState.selected)) {
                        return Colors.deepOrange.withAlpha((0.08 * 255).toInt());
                      }
                      return Colors.grey[50]!;
                    },
                  ),
                  foregroundColor: WidgetStateProperty.resolveWith<Color>(
                    (Set<WidgetState> states) {
                      if (states.contains(WidgetState.selected)) {
                        return Colors.deepOrange;
                      }
                      return Colors.grey;
                    },
                  ),
                ),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Account Name',
                  hintText: 'Enter account holder name',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter account holder name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _accountNumberController,
                decoration: const InputDecoration(
                  labelText: 'Account Number',
                  hintText: 'Enter account number',
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter account number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Set as Default', style: TextStyle(fontSize: 16)),
                  Switch(
                    value: _isDefault,
                    onChanged: (value) {
                      setState(() {
                        _isDefault = value;
                      });
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _savePaymentMethod,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  widget.paymentMethod == null
                      ? 'Add Payment Method'
                      : 'Save Changes',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
