import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class SignupPage extends StatefulWidget {
  const SignupPage({super.key});

  @override
  State<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });
      try {
        final api = ApiService();
        
        // Register customer - this creates account and sends OTP automatically
        await api.registerCustomer(
          _firstNameController.text.trim(),
          _lastNameController.text.trim(),
          _emailController.text.trim(),
          _passwordController.text,
          phoneNumber: _phoneController.text.trim(),
        );
        
        if (mounted) {
          // Navigate to email verification first, then phone verification
          Navigator.pushNamed(
            context, 
            '/email-verification',
            arguments: {
              'email': _emailController.text.trim(),
              'purpose': 'registration',
              'phoneNumber': _phoneController.text.trim(),
            },
          );
        }
      } catch (e) {
        if (mounted) {
          NotificationService.showError(context, 'Registration failed: ${e.toString().replaceAll('Exception: ', '')}');
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Container(
            margin: EdgeInsets.fromLTRB(0, 30, 0, 0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  BackButton(),
                  Container(
                    margin: EdgeInsets.only(top: 20, left: 16),
                    child: Text(
                      "Create Account",
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                      ),
                    ),
                  ),
                  Container(
                    padding: EdgeInsets.all(1),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          margin: EdgeInsets.only(top: 10, left: 16),
                          child: Text(
                            'Join us and start ordering delicious ramen!',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    margin: EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _firstNameController,
                                inputFormatters: [
                                  FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z\s]')),
                                ],
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(),
                                  hintText: 'First Name',
                                  prefixIcon: Icon(
                                    Icons.person,
                                    color: const Color.fromARGB(255, 0, 0, 0),
                                  ),
                                  labelText: 'First Name',
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your first name';
                                  }
                                  if (!RegExp(r'^[a-zA-Z\s]+$').hasMatch(value)) {
                                    return 'First name should only contain letters';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            SizedBox(width: 16),
                            Expanded(
                              child: TextFormField(
                                controller: _lastNameController,
                                inputFormatters: [
                                  FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z\s]')),
                                ],
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(),
                                  hintText: 'Last Name',
                                  prefixIcon: Icon(
                                    Icons.person,
                                    color: const Color.fromARGB(255, 0, 0, 0),
                                  ),
                                  labelText: 'Last Name',
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your last name';
                                  }
                                  if (!RegExp(r'^[a-zA-Z\s]+$').hasMatch(value)) {
                                    return 'Last name should only contain letters';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        TextFormField(
                          controller: _emailController,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'Enter your email',
                            prefixIcon: Icon(
                              Icons.email,
                              color: const Color.fromARGB(255, 0, 0, 0),
                            ),
                            labelText: 'Email',
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please enter your email';
                            }
                            // Use a standard email regex
                            if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}').hasMatch(value)) {
                              return 'Please enter a valid email';
                            }
                            return null;
                          },
                        ),
                        SizedBox(height: 16),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(11), // PH mobile numbers are 11 digits
                          ],
                          decoration: InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: '09XXXXXXXXX',
                            prefixIcon: Icon(
                              Icons.phone,
                              color: const Color.fromARGB(255, 0, 0, 0),
                            ),
                            labelText: 'Phone Number',
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please enter your phone number';
                            }
                            // Philippine mobile number validation
                            if (!RegExp(r'^09[0-9]{9}$').hasMatch(value)) {
                              return 'Please enter a valid PH mobile number (09XXXXXXXXX)';
                            }
                            return null;
                          },
                        ),
                        SizedBox(height: 16),
                        TextFormField(
                          controller: _passwordController,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'Enter your password',
                            prefixIcon: Icon(
                              Icons.lock,
                              color: const Color.fromARGB(255, 0, 0, 0),
                            ),
                            labelText: 'Password',
                            suffixIcon: IconButton(
                              icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                          ),
                          obscureText: _obscurePassword,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please enter your password';
                            }
                            if (value.length < 6) {
                              return 'Password must be at least 6 characters';
                            }
                            return null;
                          },
                        ),
                        SizedBox(height: 16),
                        TextFormField(
                          controller: _confirmPasswordController,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'Confirm Password',
                            prefixIcon: Icon(
                              Icons.lock,
                              color: const Color.fromARGB(255, 0, 0, 0),
                            ),
                            labelText: 'Confirm Password',
                            suffixIcon: IconButton(
                              icon: Icon(_obscureConfirmPassword ? Icons.visibility_off : Icons.visibility),
                              onPressed: () {
                                setState(() {
                                  _obscureConfirmPassword = !_obscureConfirmPassword;
                                });
                              },
                            ),
                          ),
                          obscureText: _obscureConfirmPassword,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please confirm your password';
                            }
                            if (value != _passwordController.text) {
                              return 'Passwords do not match';
                            }
                            return null;
                          },
                        ),
                        SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _register,
                            child: _isLoading
                                ? SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text('Sign Up'),
                          ),
                        ),
                        SizedBox(height: 30), // Add some bottom padding
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
