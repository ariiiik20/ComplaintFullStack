const { body } = require('express-validator');

const createFeedbackValidation = [
  body('complaintId')
    .notEmpty()
    .withMessage('Complaint ID is required')
    .isMongoId()
    .withMessage('Invalid Complaint ID'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters'),
];

module.exports = { createFeedbackValidation };
