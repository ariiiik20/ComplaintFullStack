const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAssignedComplaints,
  getAllComplaints,
  assignAgent,
  updateComplaintStatus,
  escalateComplaint,
} = require('../controllers/complaintController');
const {
  createComplaintValidation,
  updateStatusValidation,
  assignAgentValidation,
} = require('../validators/complaintValidators');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// POST /api/complaints - Create complaint (USER) with up to 3 attachments
router.post(
  '/',
  authorize('USER'),
  upload.array('attachments', 3),
  createComplaintValidation,
  validate,
  createComplaint
);

// GET /api/complaints/my & GET /api/complaints/my-complaints - Fetch user complaints (USER)
router.get('/my', authorize('USER'), getMyComplaints);
router.get('/my-complaints', authorize('USER'), getMyComplaints);

// GET /api/complaints/assigned - Fetch assigned complaints (AGENT)
router.get('/assigned', authorize('AGENT'), getAssignedComplaints);

// GET /api/complaints/all & GET /api/complaints - Fetch all complaints (ADMIN)
router.get('/all', authorize('ADMIN'), getAllComplaints);
router.get('/', authorize('ADMIN'), getAllComplaints);

// PATCH & PUT /api/complaints/:id/assign - Assign agent (ADMIN)
router.patch('/:id/assign', authorize('ADMIN'), assignAgentValidation, validate, assignAgent);
router.put('/:id/assign', authorize('ADMIN'), assignAgentValidation, validate, assignAgent);

// PATCH & PUT /api/complaints/:id/status - Update status (AGENT / ADMIN)
router.patch('/:id/status', authorize('AGENT', 'ADMIN'), updateStatusValidation, validate, updateComplaintStatus);
router.put('/:id/status', authorize('AGENT', 'ADMIN'), updateStatusValidation, validate, updateComplaintStatus);

// PATCH & PUT /api/complaints/:id/escalate - Escalate / Request reassignment (AGENT)
router.patch('/:id/escalate', authorize('AGENT'), escalateComplaint);
router.put('/:id/escalate', authorize('AGENT'), escalateComplaint);

// GET /api/complaints/:id - Get complaint by ID (USER, AGENT, ADMIN)
router.get('/:id', authorize('USER', 'AGENT', 'ADMIN'), getComplaintById);

module.exports = router;
