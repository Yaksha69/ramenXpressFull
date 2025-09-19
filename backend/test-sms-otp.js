const axios = require('axios');

// Test SMS OTP functionality
const BASE_URL = 'http://localhost:3000/api/v1/otp';

// Test phone number (replace with your test number)
const TEST_PHONE = '639761700936';

async function testSMSCredits() {
  console.log('🔍 Testing SMS Credits...');
  try {
    const response = await axios.get(`${BASE_URL}/sms-credits`);
    console.log('✅ SMS Credits Response:', response.data);
  } catch (error) {
    console.error('❌ SMS Credits Error:', error.response?.data || error.message);
  }
}

async function testSendOTP() {
  console.log('\n📱 Testing Send OTP...');
  try {
    const response = await axios.post(`${BASE_URL}/send-phone-otp`, {
      phoneNumber: TEST_PHONE,
      customMessage: 'Your RamenXpress verification code is :otp. Valid for 5 minutes.'
    });
    console.log('✅ Send OTP Response:', response.data);
  } catch (error) {
    console.error('❌ Send OTP Error:', error.response?.data || error.message);
  }
}

async function testVerifyOTP(otpCode) {
  console.log('\n🔐 Testing Verify OTP...');
  try {
    const response = await axios.post(`${BASE_URL}/verify-phone-otp`, {
      phoneNumber: TEST_PHONE,
      otpCode: otpCode
    });
    console.log('✅ Verify OTP Response:', response.data);
  } catch (error) {
    console.error('❌ Verify OTP Error:', error.response?.data || error.message);
  }
}

async function testLoginOTP() {
  console.log('\n🔑 Testing Send Login OTP...');
  try {
    const response = await axios.post(`${BASE_URL}/send-login-phone-otp`, {
      phoneNumber: TEST_PHONE,
      customMessage: 'Your RamenXpress login code is :otp. Valid for 5 minutes.'
    });
    console.log('✅ Send Login OTP Response:', response.data);
  } catch (error) {
    console.error('❌ Send Login OTP Error:', error.response?.data || error.message);
  }
}

async function testGetOTPList() {
  console.log('\n📋 Testing Get OTP List...');
  try {
    const response = await axios.get(`${BASE_URL}/phone-otp-list/${TEST_PHONE}`);
    console.log('✅ Get OTP List Response:', response.data);
  } catch (error) {
    console.error('❌ Get OTP List Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting SMS OTP Tests...');
  console.log(`📞 Test Phone Number: ${TEST_PHONE}`);
  console.log('⚠️  Make sure your server is running and SMS_API_TOKEN is set in .env\n');

  // Test 1: Check SMS credits
  await testSMSCredits();

  // Test 2: Send OTP
  await testSendOTP();

  // Test 3: Get OTP list (for debugging)
  await testGetOTPList();

  // Test 4: Send Login OTP
  await testLoginOTP();

  console.log('\n✅ All tests completed!');
  console.log('\n📝 Manual Test Steps:');
  console.log('1. Check your phone for the SMS with OTP code');
  console.log('2. Use the verify-phone-otp endpoint with the received code');
  console.log('3. Example: node test-sms-otp.js verify 123456');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args[0] === 'verify' && args[1]) {
  testVerifyOTP(args[1]);
} else if (args[0] === 'credits') {
  testSMSCredits();
} else if (args[0] === 'send') {
  testSendOTP();
} else if (args[0] === 'login') {
  testLoginOTP();
} else if (args[0] === 'list') {
  testGetOTPList();
} else {
  runTests();
}

module.exports = {
  testSMSCredits,
  testSendOTP,
  testVerifyOTP,
  testLoginOTP,
  testGetOTPList
};
