import 'package:flutter/material.dart';
import '../models/payment_method.dart';

class EditPaymentMethodPage extends StatefulWidget {
  final Map<String, dynamic>? paymentMethod;
  final bool isReadOnly;

  const EditPaymentMethodPage({super.key, this.paymentMethod, this.isReadOnly = false});

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

  List<Widget> _buildPayMongoInfo() {
    final paymentName = _selectedType == PaymentType.gcash ? 'GCash' : 'PayMaya';
    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(
                _selectedType == PaymentType.gcash 
                    ? Icons.account_balance_wallet 
                    : Icons.account_balance,
                size: 64,
                color: Colors.orange,
              ),
              const SizedBox(height: 16),
              Text(
                paymentName,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Powered by PayMongo',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue[200]!),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      color: Colors.blue,
                      size: 20,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'When you select $paymentName during checkout, you\'ll be redirected to the secure $paymentName payment gateway. No need to enter account details here.',
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.blue,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
      ElevatedButton(
        onPressed: () => Navigator.pop(context),
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 50),
          backgroundColor: Colors.orange,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: const Text('Got it'),
      ),
    ];
  }

  List<Widget> _buildPaymentForm() {
    return [
      Form(
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
    ];
  }

  @override
  Widget build(BuildContext context) {
    // For PayMongo integration, we don't allow editing GCash/PayMaya
    final isDigitalWallet = _selectedType == PaymentType.gcash || _selectedType == PaymentType.maya;
    
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.paymentMethod == null
              ? 'Payment Methods'
              : 'Payment Method Details',
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isDigitalWallet) ..._buildPayMongoInfo() else ..._buildPaymentForm(),
          ],
        ),
      ),
    );
  }
}
