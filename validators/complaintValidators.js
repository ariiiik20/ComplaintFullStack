const { body } = require('express-validator');

const createComplaintValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['IT', 'Maintenance', 'Billing', 'Academic', 'General', 'Facility', 'HR', 'Finance'])
    .withMessage('Invalid category'),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid priority'),
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'])
    .withMessage('Invalid status'),

  body('remark')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remark cannot exceed 500 characters'),
];

const assignAgentValidation = [
  body('agentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Agent ID'),
  body('assignedAgent')
    .optional()
    .isMongoId()
    .withMessage('Invalid Assigned Agent ID'),
];

module.exports = {
  createComplaintValidation,
  updateStatusValidation,
  assignAgentValidation,
};
