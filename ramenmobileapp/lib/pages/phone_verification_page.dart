import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../services/otp_service.dart';
import '../services/notification_service.dart';

class PhoneVerificationPage extends StatefulWidget {
  final String phoneNumber;
  final bool isLogin;
  final VoidCallback? onVerificationSuccess;

  const PhoneVerificationPage({
    super.key,
    required this.phoneNumber,
    this.isLogin = false,
    this.onVerificationSuccess,
  });

  @override
  State<PhoneVerificationPage> createState() => _PhoneVerificationPageState();
}

class _PhoneVerificationPageState extends State<PhoneVerificationPage> {
  final List<TextEditingController> _otpControllers = List.generate(6, (index) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (index) => FocusNode());
  
  bool _isLoading = false;
  bool _isResending = false;
  String _errorMessage = '';
  int _resendCountdown = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _sendOTP();
  }

  @override
  void dispose() {
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var focusNode in _focusNodes) {
      focusNode.dispose();
    }
    _timer?.cancel();
    super.dispose();
  }

  void _sendOTP() async {
    if (!mounted) return;
    
    setState(() {
      _isResending = true;
      _errorMessage = '';
    });

    try {
      Map<String, dynamic> result;
      if (widget.isLogin) {
        result = await OTPService.sendLoginPhoneOTP(widget.phoneNumber);
      } else {
        result = await OTPService.sendPhoneOTP(widget.phoneNumber);
      }

      if (!mounted) return;

      if (result['success']) {
        _startResendCountdown();
        if (mounted) {
          NotificationService.showSuccess(
            context,
            'Verification code sent to ${widget.phoneNumber}',
          );
        }
      } else {
        if (mounted) {
          setState(() {
            _errorMessage = result['message'];
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to send verification code. Please try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isResending = false;
        });
      }
    }
  }

  void _startResendCountdown() {
    if (!mounted) return;
    
    setState(() {
      _resendCountdown = 60;
    });
    
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      
      setState(() {
        _resendCountdown--;
      });
      
      if (_resendCountdown <= 0) {
        timer.cancel();
      }
    });
  }

  void _verifyOTP() async {
    String otpCode = _otpControllers.map((controller) => controller.text).join();
    
    if (otpCode.length != 6) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Please enter the complete 6-digit code';
        });
      }
      return;
    }

    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      Map<String, dynamic> result;
      if (widget.isLogin) {
        result = await OTPService.verifyLoginPhoneOTP(widget.phoneNumber, otpCode);
      } else {
        result = await OTPService.verifyPhoneOTP(widget.phoneNumber, otpCode);
      }

      if (!mounted) return;

      if (result['success']) {
        if (mounted) {
          NotificationService.showSuccess(
            context,
            'Phone number verified successfully! 📱✅',
          );
          
          // Call success callback if provided
          widget.onVerificationSuccess?.call();
          
          // Navigate back or to next screen
          Navigator.of(context).pop(true);
        }
      } else {
        if (mounted) {
          setState(() {
            _errorMessage = result['message'];
          });
          
          // Clear the OTP fields on error
          for (var controller in _otpControllers) {
            controller.clear();
          }
          _focusNodes[0].requestFocus();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Verification failed. Please try again.';
        });
        
        // Clear the OTP fields on error
        for (var controller in _otpControllers) {
          controller.clear();
        }
        _focusNodes[0].requestFocus();
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _onOTPChanged(String value, int index) {
    if (!mounted) return;
    
    setState(() {
      _errorMessage = '';
    });

    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }

    // Auto-verify when all 6 digits are entered
    String otpCode = _otpControllers.map((controller) => controller.text).join();
    if (otpCode.length == 6) {
      _verifyOTP();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              
              // Back button
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back, size: 24),
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Phone verification icon
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: const Color(0xFFD32D43).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.sms_outlined,
                  size: 60,
                  color: Color(0xFFD32D43),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Title
              const Text(
                'Verify Your Phone',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Description
              Text(
                'We\'ve sent a 6-digit verification code to',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 8),
              
              Text(
                widget.phoneNumber,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFFD32D43),
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 40),
              
              // OTP Input Fields
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 45,
                    height: 55,
                    child: TextFormField(
                      controller: _otpControllers[index],
                      focusNode: _focusNodes[index],
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 1,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: _errorMessage.isNotEmpty 
                                ? Colors.red 
                                : Colors.grey[300]!,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: _errorMessage.isNotEmpty 
                                ? Colors.red 
                                : const Color(0xFFD32D43),
                            width: 2,
                          ),
                        ),
                        filled: true,
                        fillColor: Colors.grey[50],
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      onChanged: (value) => _onOTPChanged(value, index),
                      onTap: () {
                        _otpControllers[index].selection = TextSelection.fromPosition(
                          TextPosition(offset: _otpControllers[index].text.length),
                        );
                      },
                    ),
                  );
                }),
              ),
              
              const SizedBox(height: 20),
              
              // Error message
              if (_errorMessage.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red[200]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red[600], size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage,
                          style: TextStyle(
                            color: Colors.red[600],
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              
              const SizedBox(height: 32),
              
              // Verify button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _verifyOTP,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32D43),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    disabledBackgroundColor: Colors.grey[300],
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
                          'Verify Phone',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Resend code section
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Didn\'t receive the code? ',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  if (_resendCountdown > 0)
                    Text(
                      'Resend in ${_resendCountdown}s',
                      style: TextStyle(
                        color: Colors.grey[500],
                        fontWeight: FontWeight.w500,
                      ),
                    )
                  else
                    TextButton(
                      onPressed: _isResending ? null : _sendOTP,
                      child: _isResending
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Color(0xFFD32D43),
                              ),
                            )
                          : const Text(
                              'Resend Code',
                              style: TextStyle(
                                color: Color(0xFFD32D43),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                ],
              ),
              
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
