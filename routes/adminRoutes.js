const express = require('express');
const router = express.Router();
const { getAnalytics, getAgents, createAgent } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require authentication + ADMIN role
router.use(protect, authorize('ADMIN'));

// @route   GET /api/admin/analytics
router.get('/analytics', getAnalytics);

// @route   GET /api/admin/agents
router.get('/agents', getAgents);

// @route   POST /api/admin/agents
router.post('/agents', createAgent);

module.exports = router;
