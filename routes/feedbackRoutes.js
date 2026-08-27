const express = require('express');
const router = express.Router();
const { createFeedback, getFeedbackStats, getAllFeedbacks } = require('../controllers/feedbackController');
const { createFeedbackValidation } = require('../validators/feedbackValidators');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// USER: submit feedback
router.post('/', authorize('USER'), createFeedbackValidation, validate, createFeedback);

// ADMIN: feedback stats & list
router.get('/stats', authorize('ADMIN'), getFeedbackStats);
router.get('/', authorize('ADMIN'), getAllFeedbacks);

module.exports = router;
