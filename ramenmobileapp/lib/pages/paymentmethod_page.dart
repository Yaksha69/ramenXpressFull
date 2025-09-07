import 'package:flutter/material.dart';
import '../models/payment_method.dart';
import 'edit_payment_method_page.dart';
import '../services/api_service.dart';

class PaymentmethodPage extends StatefulWidget {
  const PaymentmethodPage({super.key});

  @override
  State<PaymentmethodPage> createState() => _PaymentmethodPageState();
}

class _PaymentmethodPageState extends State<PaymentmethodPage> {
  List<PaymentMethod> paymentMethods = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPaymentMethods();
  }

  Future<void> _fetchPaymentMethods() async {
    setState(() { _isLoading = true; });
    try {
      final api = ApiService();
      final methods = await api.getPaymentMethods();
      setState(() {
        paymentMethods = methods;
      });
    } catch (e) {
      setState(() {
        paymentMethods = [];
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load payment methods: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  void _setDefaultMethod(int index) {
    setState(() {
      for (int i = 0; i < paymentMethods.length; i++) {
        paymentMethods[i] = PaymentMethod(
          id: paymentMethods[i].id,
          type: paymentMethods[i].type,
          title: paymentMethods[i].title,
          accountNumber: paymentMethods[i].accountNumber,
          isDefault: i == index,
        );
      }
    });
  }

  Future<void> _addPaymentMethod() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const EditPaymentMethodPage(),
      ),
    );
    if (result != null && result is Map<String, dynamic>) {
      try {
        final api = ApiService();
        await api.createPaymentMethodFromMap({
          'type': result['type'].toString().split('.').last,
          'title': result['title'],
          'accountName': result['title'],
          'mobileNumber': result['accountNumber'],
          'isDefault': result['isDefault'] ?? false,
        });
        await _fetchPaymentMethods();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment method added successfully'), backgroundColor: Colors.green),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add payment method: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _editPaymentMethod(int index) async {
    final method = paymentMethods[index];
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditPaymentMethodPage(
          paymentMethod: {
            'type': method.type,
            'title': method.title,
            'accountNumber': method.accountNumber,
            'isDefault': method.isDefault,
          },
        ),
      ),
    );
    if (result != null && result is Map<String, dynamic>) {
      setState(() {
        // If set as default, unset all others
        if (result['isDefault'] == true) {
          for (int i = 0; i < paymentMethods.length; i++) {
            paymentMethods[i] = PaymentMethod(
              id: paymentMethods[i].id,
              type: paymentMethods[i].type,
              title: paymentMethods[i].title,
              accountNumber: paymentMethods[i].accountNumber,
              isDefault: false,
            );
          }
        }
        paymentMethods[index] = PaymentMethod(
          id: method.id,
          type: result['type'],
          title: result['title'],
          accountNumber: result['accountNumber'],
          isDefault: result['isDefault'] ?? false,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Methods'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: paymentMethods.length,
                    itemBuilder: (context, index) {
                      final method = paymentMethods[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: ListTile(
                          leading: Icon(
                            method.icon,
                            color: Colors.orange,
                            size: 32,
                          ),
                          title: Row(
                            children: [
                              Text(
                                method.displayName,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              if (method.isDefault)
                                Container(
                                  margin: const EdgeInsets.only(left: 8),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.orange[100],
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'Default',
                                    style: TextStyle(
                                      color: Colors.orange,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          subtitle: Text(method.title),
                          trailing: IconButton(
                            icon: const Icon(Icons.edit, color: Colors.grey),
                            onPressed: () {
                              _editPaymentMethod(index);
                            },
                          ),
                          onTap: () {
                            _setDefaultMethod(index);
                          },
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _addPaymentMethod,
                      icon: const Icon(Icons.add),
                      label: const Text('Add Payment Method'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
