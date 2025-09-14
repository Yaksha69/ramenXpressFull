require('dotenv').config();
const paymongoService = require('./services/paymongoService');

async function testPayMongoQR() {
    try {
        console.log('🧪 Testing PayMongo QR Code Generation...\n');
        
        // Test GCash QR
        console.log('📱 Testing GCash QR Code...');
        const gcashResult = await paymongoService.generatePOSQRCode(
            25.00,
            'POS-TEST-GCASH-001',
            'gcash'
        );

        if (gcashResult.success) {
            console.log('✅ GCash QR Code generated successfully!');
            console.log('   Source ID:', gcashResult.data.sourceId);
            console.log('   Amount: ₱' + gcashResult.data.amount);
            console.log('   Payment Method:', gcashResult.data.paymentMethod);
            console.log('   Status:', gcashResult.data.status);
            console.log('   QR Code Size:', gcashResult.data.qrCodeDataURL.length, 'characters');
        } else {
            console.error('❌ GCash QR Code generation failed:', gcashResult.error);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test PayMaya QR
        console.log('💳 Testing PayMaya QR Code...');
        const paymayaResult = await paymongoService.generatePOSQRCode(
            30.00,
            'POS-TEST-PAYMAYA-001',
            'paymaya'
        );

        if (paymayaResult.success) {
            console.log('✅ PayMaya QR Code generated successfully!');
            console.log('   Source ID:', paymayaResult.data.sourceId);
            console.log('   Amount: ₱' + paymayaResult.data.amount);
            console.log('   Payment Method:', paymayaResult.data.paymentMethod);
            console.log('   Status:', paymayaResult.data.status);
            console.log('   QR Code Size:', paymayaResult.data.qrCodeDataURL.length, 'characters');
        } else {
            console.error('❌ PayMaya QR Code generation failed:', paymayaResult.error);
        }

        console.log('\n🎉 PayMongo QR Code Backend Test Completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testPayMongoQR();
