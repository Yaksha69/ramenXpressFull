const PaymentMethod = require('../models/paymentMethod');

// Get all payment methods for a customer
exports.getPaymentMethods = async (req, res) => {
  try {
    const customerId = req.customerId;

    const paymentMethods = await PaymentMethod.find({ customerId })
      .sort({ isDefault: -1, createdAt: -1 });

    // Return masked data for security
    const maskedPaymentMethods = paymentMethods.map(pm => pm.getMaskedData());

    res.json({
      success: true,
      data: maskedPaymentMethods
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Add a new payment method
exports.addPaymentMethod = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { type, title, accountName, mobileNumber, isDefault } = req.body;

    // Validate required fields
    if (!type || !title || !accountName || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, account name, and mobile number are required'
      });
    }

    // Validate payment type
    if (!['gcash', 'maya'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Payment type must be either gcash or maya'
      });
    }

    // If this is set as default, remove default from other payment methods
    if (isDefault) {
      await PaymentMethod.updateMany(
        { customerId },
        { isDefault: false }
      );
    }

    // Create new payment method
    const paymentMethod = new PaymentMethod({
      customerId,
      type,
      title,
      accountName,
      mobileNumber,
      isDefault: isDefault || false
    });

    await paymentMethod.save();

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: paymentMethod.getMaskedData()
    });

  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update a payment method
exports.updatePaymentMethod = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { paymentMethodId } = req.params;
    const { title, accountName, mobileNumber, isDefault } = req.body;

    const paymentMethod = await PaymentMethod.findOne({
      _id: paymentMethodId,
      customerId
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // If setting as default, remove default from other payment methods
    if (isDefault) {
      await PaymentMethod.updateMany(
        { customerId, _id: { $ne: paymentMethodId } },
        { isDefault: false }
      );
    }

    // Update fields
    if (title) paymentMethod.title = title;
    if (accountName) paymentMethod.accountName = accountName;
    if (mobileNumber) paymentMethod.mobileNumber = mobileNumber;
    if (typeof isDefault === 'boolean') paymentMethod.isDefault = isDefault;

    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: paymentMethod.getMaskedData()
    });

  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { paymentMethodId } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      _id: paymentMethodId,
      customerId
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // If this was the default payment method, set another one as default
    if (paymentMethod.isDefault) {
      const otherPaymentMethod = await PaymentMethod.findOne({
        customerId,
        _id: { $ne: paymentMethodId }
      });

      if (otherPaymentMethod) {
        otherPaymentMethod.isDefault = true;
        await otherPaymentMethod.save();
      }
    }

    await PaymentMethod.findByIdAndDelete(paymentMethodId);

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Set default payment method
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { paymentMethodId } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      _id: paymentMethodId,
      customerId
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Remove default from all payment methods
    await PaymentMethod.updateMany(
      { customerId },
      { isDefault: false }
    );

    // Set the specified payment method as default
    paymentMethod.isDefault = true;
    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Default payment method updated successfully',
      data: paymentMethod.getMaskedData()
    });

  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get default payment method
exports.getDefaultPaymentMethod = async (req, res) => {
  try {
    const customerId = req.customerId;

    const defaultPaymentMethod = await PaymentMethod.findOne({
      customerId,
      isDefault: true
    });

    if (!defaultPaymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'No default payment method found'
      });
    }

    res.json({
      success: true,
      data: defaultPaymentMethod.getMaskedData()
    });

  } catch (error) {
    console.error('Error fetching default payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}; 