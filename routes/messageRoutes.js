const express = require('express');
const router = express.Router();
const {
  createMessage,
  getMessagesByComplaint,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

// All message routes require authentication
router.use(protect);

// POST /api/messages - Send a message (body: { complaintId, text })
router.post('/', createMessage);

// POST /api/messages/:complaintId - Send a message for a specific complaint
router.post('/:complaintId', createMessage);

// GET /api/messages/:complaintId - Get all messages for a specific complaint
router.get('/:complaintId', getMessagesByComplaint);

module.exports = router;
