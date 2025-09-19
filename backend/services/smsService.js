const axios = require('axios');

class SMSService {
  constructor() {
    this.apiToken = process.env.SMS_API_TOKEN;
    this.baseURL = 'https://sms.iprogtech.com/api/v1';
    
    if (!this.apiToken) {
      console.warn('⚠️ SMS_API_TOKEN not found in environment variables');
    }
  }

  /**
   * Send OTP via SMS
   * @param {string} phoneNumber - Phone number in international format (e.g., 639171234567)
   * @param {string} customMessage - Optional custom message (will use default if not provided)
   * @returns {Promise<Object>} - Result object with success status and data
   */
  async sendOTP(phoneNumber, customMessage = null) {
    try {
      if (!this.apiToken) {
        throw new Error('SMS API token not configured');
      }

      // Format phone number to ensure it starts with country code
      const formattedPhoneNumber = this.formatPhoneNumber(phoneNumber);
      
      const requestData = {
        api_token: this.apiToken,
        phone_number: formattedPhoneNumber
      };

      // Add custom message if provided
      if (customMessage) {
        requestData.message = customMessage;
      }

      const response = await axios.post(`${this.baseURL}/otp/send_otp`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          message: 'OTP sent successfully',
          data: {
            otpCode: response.data.data.otp_code,
            expiresAt: response.data.data.otp_code_expires_at,
            phoneNumber: response.data.data.phone_number,
            message: response.data.data.message
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to send OTP'
        };
      }
    } catch (error) {
      console.error('SMS OTP send error:', error);
      
      if (error.response) {
        // API returned an error response
        return {
          success: false,
          message: error.response.data?.message || 'SMS API error',
          error: error.response.data
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          message: 'Unable to reach SMS service. Please try again later.'
        };
      } else {
        // Something else happened
        return {
          success: false,
          message: 'Internal error while sending SMS'
        };
      }
    }
  }

  /**
   * Verify OTP code
   * @param {string} phoneNumber - Phone number in international format
   * @param {string} otpCode - OTP code to verify
   * @returns {Promise<Object>} - Result object with success status
   */
  async verifyOTP(phoneNumber, otpCode) {
    try {
      if (!this.apiToken) {
        throw new Error('SMS API token not configured');
      }

      const formattedPhoneNumber = this.formatPhoneNumber(phoneNumber);
      
      const requestData = {
        api_token: this.apiToken,
        phone_number: formattedPhoneNumber,
        otp: otpCode
      };

      const response = await axios.post(`${this.baseURL}/otp/verify_otp`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          message: 'OTP verified successfully'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Invalid OTP code'
        };
      }
    } catch (error) {
      console.error('SMS OTP verify error:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || 'OTP verification failed',
          error: error.response.data
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Unable to reach SMS service. Please try again later.'
        };
      } else {
        return {
          success: false,
          message: 'Internal error while verifying OTP'
        };
      }
    }
  }

  /**
   * Get OTP list for a phone number
   * @param {string} phoneNumber - Phone number in international format
   * @returns {Promise<Object>} - Result object with OTP list
   */
  async getOTPList(phoneNumber) {
    try {
      if (!this.apiToken) {
        throw new Error('SMS API token not configured');
      }

      const formattedPhoneNumber = this.formatPhoneNumber(phoneNumber);
      
      const response = await axios.get(`${this.baseURL}/otp`, {
        params: {
          api_token: this.apiToken,
          phone_number: formattedPhoneNumber
        },
        timeout: 10000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to get OTP list'
        };
      }
    } catch (error) {
      console.error('SMS OTP list error:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || 'Failed to get OTP list',
          error: error.response.data
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Unable to reach SMS service. Please try again later.'
        };
      } else {
        return {
          success: false,
          message: 'Internal error while getting OTP list'
        };
      }
    }
  }

  /**
   * Check SMS credits balance
   * @returns {Promise<Object>} - Result object with credit balance
   */
  async checkCredits() {
    try {
      if (!this.apiToken) {
        throw new Error('SMS API token not configured');
      }

      const response = await axios.get(`${this.baseURL}/account/sms_credits`, {
        params: {
          api_token: this.apiToken
        },
        timeout: 10000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            loadBalance: response.data.data.load_balance
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to check credits'
        };
      }
    } catch (error) {
      console.error('SMS credits check error:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || 'Failed to check credits',
          error: error.response.data
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Unable to reach SMS service. Please try again later.'
        };
      } else {
        return {
          success: false,
          message: 'Internal error while checking credits'
        };
      }
    }
  }

  /**
   * Format phone number to international format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with 63 (Philippines country code)
    if (cleaned.startsWith('0')) {
      cleaned = '63' + cleaned.substring(1);
    }
    
    // If it doesn't start with 63, add it
    if (!cleaned.startsWith('63')) {
      cleaned = '63' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - Whether the phone number is valid
   */
  validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Philippine mobile number
    // Should be 10-11 digits after country code 63
    const philippineMobilePattern = /^63(9\d{9}|2\d{8})$/;
    
    return philippineMobilePattern.test(cleaned);
  }
}

module.exports = new SMSService();
