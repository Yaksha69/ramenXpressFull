import 'package:flutter/material.dart';
import '../models/payment_method.dart';

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
    // Always show default payment methods immediately - no loading or API dependency
    paymentMethods = [
      PaymentMethod(
        id: 'cash',
        type: PaymentType.cash,
        title: 'Cash on Delivery',
        isDefault: true,
      ),
      PaymentMethod(
        id: 'gcash',
        type: PaymentType.gcash,
        title: 'GCash'
      ),
      PaymentMethod(
        id: 'maya',
        type: PaymentType.maya,
        title: 'PayMaya',
      ),
    ];
    
    setState(() {
      _isLoading = false;
    });
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
                          leading: method.logoAsset != null
                              ? Container(
                                  width: 32,
                                  height: 32,
                                  child: Image.asset(
                                    method.logoAsset!,
                                    fit: BoxFit.contain,
                                  ),
                                )
                              : Icon(
                                  method.icon,
                                  color: Colors.orange,
                                  size: 32,
                                ),
                          title: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  method.displayName,
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
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
                          trailing: method.isDefault 
                              ? const Icon(
                                  Icons.check_circle,
                                  color: Colors.orange,
                                )
                              : null,
                          onTap: () {
                            if (method.type == PaymentType.gcash || method.type == PaymentType.maya) {
                              // Show account linking info for digital wallets
                              showDialog(
                                context: context,
                                builder: (BuildContext context) {
                                  return AlertDialog(
                                    title: Text('${method.displayName} Payment'),
                                    content: Text(
                                      'To pay with ${method.displayName}, you\'ll need to link your account during checkout. '
                                      'The payment will be processed securely through PayMongo gateway.',
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () {
                                          Navigator.of(context).pop();
                                          _setDefaultMethod(index);
                                        },
                                        child: const Text('Select This Method'),
                                      ),
                                      TextButton(
                                        onPressed: () => Navigator.of(context).pop(),
                                        child: const Text('Cancel'),
                                      ),
                                    ],
                                  );
                                },
                              );
                            } else {
                              _setDefaultMethod(index);
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
