const DeliveryAddress = require('../models/deliveryAddress');

// Get all delivery addresses for a customer
exports.getDeliveryAddresses = async (req, res) => {
  try {
    const customerId = req.customerId;

    const deliveryAddresses = await DeliveryAddress.find({ customerId })
      .sort({ isDefault: -1, createdAt: -1 });

    const addressSummaries = deliveryAddresses.map(addr => addr.getAddressSummary());

    res.json({
      success: true,
      data: addressSummaries
    });

  } catch (error) {
    console.error('Error fetching delivery addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Add a new delivery address
exports.addDeliveryAddress = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { recipientName, recipientMobile, street, barangay, municipality, province, zipCode, isDefault } = req.body;

    // Validate required fields
    if (!recipientName || !recipientMobile || !street || !barangay || !municipality || !province || !zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name, mobile number, street, barangay, municipality, province, and zip code are required'
      });
    }

    // If this is set as default, remove default from other addresses
    if (isDefault) {
      await DeliveryAddress.updateMany(
        { customerId },
        { isDefault: false }
      );
    }

    // Create new delivery address
    const deliveryAddress = new DeliveryAddress({
      customerId,
      recipientName,
      recipientMobile,
      street,
      barangay,
      municipality,
      province,
      zipCode,
      isDefault: isDefault || false
    });

    await deliveryAddress.save();

    res.status(201).json({
      success: true,
      message: 'Delivery address added successfully',
      data: deliveryAddress.getAddressSummary()
    });

  } catch (error) {
    console.error('Error adding delivery address:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update a delivery address
exports.updateDeliveryAddress = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { addressId } = req.params;
    const { recipientName, recipientMobile, street, barangay, municipality, province, zipCode, isDefault } = req.body;

    const deliveryAddress = await DeliveryAddress.findOne({
      _id: addressId,
      customerId
    });

    if (!deliveryAddress) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found'
      });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      await DeliveryAddress.updateMany(
        { customerId, _id: { $ne: addressId } },
        { isDefault: false }
      );
    }

    // Update fields
    if (recipientName) deliveryAddress.recipientName = recipientName;
    if (recipientMobile) deliveryAddress.recipientMobile = recipientMobile;
    if (street) deliveryAddress.street = street;
    if (barangay) deliveryAddress.barangay = barangay;
    if (municipality) deliveryAddress.municipality = municipality;
    if (province) deliveryAddress.province = province;
    if (zipCode) deliveryAddress.zipCode = zipCode;
    if (typeof isDefault === 'boolean') deliveryAddress.isDefault = isDefault;

    await deliveryAddress.save();

    res.json({
      success: true,
      message: 'Delivery address updated successfully',
      data: deliveryAddress.getAddressSummary()
    });

  } catch (error) {
    console.error('Error updating delivery address:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a delivery address
exports.deleteDeliveryAddress = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { addressId } = req.params;

    const deliveryAddress = await DeliveryAddress.findOne({
      _id: addressId,
      customerId
    });

    if (!deliveryAddress) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found'
      });
    }

    // If this was the default address, set another one as default
    if (deliveryAddress.isDefault) {
      const otherAddress = await DeliveryAddress.findOne({
        customerId,
        _id: { $ne: addressId }
      });

      if (otherAddress) {
        otherAddress.isDefault = true;
        await otherAddress.save();
      }
    }

    await DeliveryAddress.findByIdAndDelete(addressId);

    res.json({
      success: true,
      message: 'Delivery address deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting delivery address:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Set default delivery address
exports.setDefaultDeliveryAddress = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { addressId } = req.params;

    const deliveryAddress = await DeliveryAddress.findOne({
      _id: addressId,
      customerId
    });

    if (!deliveryAddress) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found'
      });
    }

    // Remove default from all addresses
    await DeliveryAddress.updateMany(
      { customerId },
      { isDefault: false }
    );

    // Set the specified address as default
    deliveryAddress.isDefault = true;
    await deliveryAddress.save();

    res.json({
      success: true,
      message: 'Default delivery address updated successfully',
      data: deliveryAddress.getAddressSummary()
    });

  } catch (error) {
    console.error('Error setting default delivery address:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get default delivery address
exports.getDefaultDeliveryAddress = async (req, res) => {
  try {
    const customerId = req.customerId;

    const defaultAddress = await DeliveryAddress.findOne({
      customerId,
      isDefault: true
    });

    if (!defaultAddress) {
      return res.status(404).json({
        success: false,
        message: 'No default delivery address found'
      });
    }

    res.json({
      success: true,
      data: defaultAddress.getAddressSummary()
    });

  } catch (error) {
    console.error('Error fetching default delivery address:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}; 