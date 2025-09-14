require('dotenv').config();
const axios = require('axios');

async function testPayMongoConnection() {
    try {
        const secretKey = process.env.PAYMONGO_SECRET_KEY;
        
        if (!secretKey) {
            console.error('❌ PAYMONGO_SECRET_KEY not found in environment variables');
            return;
        }

        console.log('🔑 Testing PayMongo connection...');
        console.log('Secret Key:', secretKey.substring(0, 10) + '...');

        // Test 1: Payment Intent (current method)
        console.log('\n📋 Testing Payment Intent...');
        const paymentIntentResponse = await axios.post('https://api.paymongo.com/v1/payment_intents', {
            data: {
                attributes: {
                    amount: 2000, // 20 PHP minimum
                    currency: 'PHP',
                    description: 'Test connection from RamenXpress POS',
                    payment_method_allowed: ['card', 'paymaya', 'gcash']
                }
            }
        }, {
            headers: {
                'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Payment Intent created successfully!');
        console.log('Payment Intent ID:', paymentIntentResponse.data.data.id);
        console.log('Client Key:', paymentIntentResponse.data.data.attributes.client_key);

        // Test 2: QR Ph (for QR code generation)
        console.log('\n📱 Testing QR Ph...');
        try {
            const qrPhResponse = await axios.post('https://api.paymongo.com/v1/qr_ph', {
                data: {
                    attributes: {
                        amount: 2000,
                        currency: 'PHP',
                        description: 'Test QR Ph from RamenXpress POS'
                    }
                }
            }, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ QR Ph created successfully!');
            console.log('QR Ph ID:', qrPhResponse.data.data.id);
            console.log('QR Code URL:', qrPhResponse.data.data.attributes.qr_code_url);
            console.log('QR Code Data:', qrPhResponse.data.data.attributes.qr_code_data);
            
        } catch (qrError) {
            console.log('⚠️  QR Ph test failed (might not be available in test mode):');
            console.log('Error:', qrError.response?.data || qrError.message);
        }

        console.log('\n🎉 PayMongo connection test completed!');
        
    } catch (error) {
        console.error('❌ PayMongo connection failed:');
        console.error('Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.error('🔑 Check your API key - it might be invalid');
        } else if (error.response?.status === 400) {
            console.error('📝 API key is valid but request format might be wrong');
        }
    }
}

testPayMongoConnection();