const Review = require('../models/review');
const MobileOrder = require('../models/mobileOrder');

// Submit a review for an order
const submitReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const customerId = req.customerId;

    // Validate input
    if (!orderId || !rating) {
      return res.status(400).json({ message: 'Order ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if order exists and belongs to the customer
    const order = await MobileOrder.findOne({ _id: orderId, customer: customerId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found or access denied' });
    }

    // Check if order is delivered
    if (order.status.toLowerCase() !== 'delivered') {
      return res.status(400).json({ message: 'Can only review delivered orders' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ orderId, customerId });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already submitted for this order' });
    }

    // Create new review
    const review = new Review({
      orderId,
      customerId,
      rating,
      comment: comment || ''
    });

    await review.save();

    res.status(201).json({
      message: 'Review submitted successfully',
      review: {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      }
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get reviews for an order
const getOrderReviews = async (req, res) => {
  try {
    const { orderId } = req.params;

    const reviews = await Review.find({ orderId })
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all reviews (admin only)
const getAllReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find()
      .populate('orderId', 'orderNumber totalAmount')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments();

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  submitReview,
  getOrderReviews,
  getAllReviews
};
