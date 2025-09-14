const express = require('express');
const router = express.Router();
const paymongoService = require('../services/paymongoService');
const authMiddleware = require('../middleware/authMiddleware');

// Generate QR code for POS payment
router.post('/pos/generate-qr', authMiddleware, async (req, res) => {
    try {
        const { amount, orderId, paymentMethod } = req.body;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount provided'
            });
        }

        if (!paymentMethod || !['gcash', 'paymaya'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Payment method must be gcash or paymaya'
            });
        }

        // Minimum amount check (PayMongo requires at least 20 PHP)
        if (amount < 20) {
            return res.status(400).json({
                success: false,
                message: 'Minimum amount is ₱20.00'
            });
        }

        console.log(`📱 POS QR Request: ${paymentMethod} - ₱${amount} (${orderId})`);

        // Get frontend URL from request headers or use default
        let frontendUrl = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '');
        
        // If no origin/referer, use Live Server default
        if (!frontendUrl) {
            frontendUrl = 'http://127.0.0.1:5501';
        }
        
        console.log(`🌐 Using frontend URL: ${frontendUrl}`);

        const result = await paymongoService.generatePOSQRCode(
            amount, 
            orderId || `POS-${Date.now()}`, 
            paymentMethod,
            frontendUrl
        );

        if (result.success) {
            console.log(`✅ QR Code generated successfully for ${paymentMethod}`);
            res.json({
                success: true,
                data: {
                    sourceId: result.data.sourceId,
                    redirectUrl: result.data.redirectUrl,
                    qrCodeDataURL: result.data.qrCodeDataURL,
                    amount: result.data.amount,
                    orderId: result.data.orderId,
                    paymentMethod: result.data.paymentMethod,
                    status: result.data.status
                }
            });
        } else {
            console.error(`❌ QR Code generation failed:`, result.error);
            res.status(400).json({
                success: false,
                message: 'Failed to generate QR code',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Generate POS QR code error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Verify payment status (supports both Payment Intent and Source IDs)
router.get('/pos/verify-payment/:paymentId', authMiddleware, async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }

        console.log(`🔍 Verifying payment status for: ${paymentId}`);

        const result = await paymongoService.verifyPaymentSource(paymentId);

        if (result.success) {
            const status = result.data.attributes.status;
            console.log(`📊 Payment status: ${status}`);
            
            res.json({
                success: true,
                data: {
                    id: result.data.id,
                    status: status,
                    amount: result.data.attributes.amount / 100,
                    currency: result.data.attributes.currency,
                    createdAt: result.data.attributes.created_at,
                    updatedAt: result.data.attributes.updated_at || result.data.attributes.created_at
                }
            });
        } else {
            console.error(`❌ Payment verification failed:`, result.error);
            res.status(400).json({
                success: false,
                message: 'Payment verification failed',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Verify POS payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get payment source details
router.get('/pos/payment-details/:sourceId', authMiddleware, async (req, res) => {
    try {
        const { sourceId } = req.params;

        if (!sourceId) {
            return res.status(400).json({
                success: false,
                message: 'Source ID is required'
            });
        }

        const result = await paymongoService.verifyPaymentSource(sourceId);

        if (result.success) {
            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to retrieve payment details',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Get payment details error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Charge a chargeable payment source
router.post('/pos/charge-payment', authMiddleware, async (req, res) => {
    try {
        const { sourceId, amount } = req.body;

        if (!sourceId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Source ID and amount are required'
            });
        }

        console.log(`💳 Charging payment: ${sourceId} for ₱${amount}`);

        const result = await paymongoService.chargePaymentSource(sourceId, amount);

        if (result.success) {
            console.log(`✅ Payment charged successfully`);
            res.json({
                success: true,
                data: {
                    paymentId: result.data.id,
                    status: result.data.attributes.status,
                    amount: result.data.attributes.amount / 100,
                    currency: result.data.attributes.currency
                }
            });
        } else {
            console.error(`❌ Payment charging failed:`, result.error);
            res.status(400).json({
                success: false,
                message: 'Failed to charge payment',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Charge payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
