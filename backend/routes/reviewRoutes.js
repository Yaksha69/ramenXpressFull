const express = require('express');
const router = express.Router();
const { submitReview, getOrderReviews, getAllReviews } = require('../controllers/reviewController');
const { customerAuthMiddleware } = require('../middleware/customerAuthMiddleware');

// Submit a review (customer only)
router.post('/', customerAuthMiddleware, submitReview);

// Get reviews for a specific order
router.get('/order/:orderId', getOrderReviews);

// Get all reviews (admin only - add admin middleware if needed)
router.get('/', getAllReviews);

module.exports = router;
