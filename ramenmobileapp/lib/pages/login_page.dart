import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import 'email_verification_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showVerificationScreen(String email) async {
    final api = ApiService();
    
    // Show loading dialog
    NotificationService.showLoadingDialog(context, message: 'Sending verification code...');

    try {
      // Send registration OTP for verification
      await api.sendRegistrationOTP(email);
      
      // Hide loading dialog
      NotificationService.hideLoadingDialog(context);
      
      // Navigate to verification screen using push instead of pushNamed
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => EmailVerificationPage(
              email: email,
              purpose: 'login', // Changed from 'registration' to 'login'
            ),
          ),
        );
      }
    } catch (e) {
      // Hide loading dialog
      NotificationService.hideLoadingDialog(context);
      
      if (mounted) {
        NotificationService.showError(context, 'Failed to send verification code: ${e.toString().replaceAll('Exception: ', '')}');
      }
    }
  }

  Future<void> _login() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final api = ApiService();
      
      try {
        // Try to login
        await api.login(email, password);
        
        // If login successful, go directly to home (no additional OTP needed)
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/home');
        }
      } catch (e) {
        if (mounted) {
          final errorMessage = e.toString().replaceAll('Exception: ', '');
          
          // Check if error is due to unverified email
          if (errorMessage.contains('verify your email') || 
              errorMessage.contains('requiresEmailVerification') ||
              errorMessage.contains('Email not verified')) {
            
            // Show question dialog asking if user wants to verify email
            NotificationService.showQuestionDialog(
              context: context,
              title: 'Email Not Verified',
              message: 'Your email address needs to be verified before you can login. Would you like to verify it now?',
              onOkPressed: () {
                final email = _emailController.text.trim();
                _showVerificationScreen(email);
              },
              onCancelPressed: () {},
            );
          } else {
            // Show regular error message
            NotificationService.showError(context, 'Login failed: $errorMessage');
          }
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),
                Center(
                  child: Image.asset(
                    'assets/logo.png',
                    height: 150, // Increased logo height
                    width: 120, // Optional: match width
                    fit: BoxFit.contain, // Keeps it proportional
                  ),
                ),
                const SizedBox(height: 0),
                const Center(
                  child: Text(
                    'Welcome Back!',
                    style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 25),
                const Text(
                  'Sign in to continue',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    hintText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your email';
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                      return 'Please enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility
                            : Icons.visibility_off,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
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
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      NotificationService.showInfo(context, 'Forgot password feature coming soon!');
                    },
                    child: const Text('Forgot Password?'),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD32D43),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                      'Sign In',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Don\'t have an account? ',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pushNamed(context, '/signup');
                      },
                      child: const Text('Sign Up'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
