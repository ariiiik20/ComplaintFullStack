const Complaint = require('../models/Complaint');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Get system analytics for admin dashboard
 * @route   GET /api/admin/analytics
 * @access  ADMIN
 */
const getAnalytics = async (req, res, next) => {
  try {
    // Run all aggregations in parallel
    const [
      totalComplaints,
      statusCounts,
      categoryCounts,
      priorityCounts,
      avgResolutionTime,
      agentWorkload,
      recentComplaints,
    ] = await Promise.all([
      // Total complaints count
      Complaint.countDocuments(),

      // Complaints by status
      Complaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Complaints by category
      Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      // Complaints by priority
      Complaint.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      // Average resolution time (for resolved complaints)
      Complaint.aggregate([
        { $match: { status: 'Resolved' } },
        {
          $project: {
            resolutionTime: {
              $subtract: ['$updatedAt', '$createdAt'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolutionTime' },
          },
        },
      ]),

      // Agent workload (complaints assigned per agent)
      Complaint.aggregate([
        { $match: { assignedAgent: { $ne: null } } },
        {
          $group: {
            _id: '$assignedAgent',
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
            },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent',
          },
        },
        { $unwind: '$agent' },
        {
          $project: {
            agentName: '$agent.name',
            agentEmail: '$agent.email',
            total: 1,
            pending: 1,
            inProgress: 1,
            resolved: 1,
          },
        },
      ]),

      // Recent 5 complaints
      Complaint.find()
        .populate('user', 'name email')
        .populate('assignedAgent', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    // Format status counts into an object
    const statusMap = { Pending: 0, 'In Progress': 0, Resolved: 0, Rejected: 0 };
    statusCounts.forEach((s) => {
      statusMap[s._id] = s.count;
    });

    // Format category counts
    const categoryMap = {};
    categoryCounts.forEach((c) => {
      categoryMap[c._id] = c.count;
    });

    // Format priority counts
    const priorityMap = {};
    priorityCounts.forEach((p) => {
      priorityMap[p._id] = p.count;
    });

    // Average resolution time in hours
    const avgResTimeHours =
      avgResolutionTime.length > 0
        ? Math.round(avgResolutionTime[0].avgTime / (1000 * 60 * 60) * 10) / 10
        : 0;

    res.json({
      success: true,
      analytics: {
        totalComplaints,
        statusBreakdown: statusMap,
        categoryBreakdown: categoryMap,
        priorityBreakdown: priorityMap,
        avgResolutionTimeHours: avgResTimeHours,
        agentWorkload,
        recentComplaints,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all agents
 * @route   GET /api/admin/agents
 * @access  ADMIN
 */
const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'AGENT' }).select('-password');

    // Get complaint counts per agent
    const agentIds = agents.map((a) => a._id);
    const workloads = await Complaint.aggregate([
      { $match: { assignedAgent: { $in: agentIds } } },
      {
        $group: {
          _id: '$assignedAgent',
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $in: ['$status', ['Pending', 'In Progress']] }, 1, 0],
            },
          },
        },
      },
    ]);

    const workloadMap = {};
    workloads.forEach((w) => {
      workloadMap[w._id.toString()] = { total: w.total, active: w.active };
    });

    const agentsWithWorkload = agents.map((agent) => ({
      ...agent.toObject(),
      workload: workloadMap[agent._id.toString()] || { total: 0, active: 0 },
    }));

    res.json({
      success: true,
      agents: agentsWithWorkload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new Agent account (Admin)
 * @route   POST /api/admin/agents
 * @access  ADMIN
 */
const createAgent = async (req, res, next) => {
  try {
    const { name, email, password, department, phone } = req.body;

    if (!name || !email || !password) {
      return next(new ApiError('Please provide name, email, and password', 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError('User with this email already exists', 400));
    }

    const agent = await User.create({
      name,
      email,
      password,
      role: 'AGENT',
      department: department || 'IT',
      phone: phone || '',
      contactNumber: phone || '',
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        department: agent.department,
        phone: agent.phone,
        createdAt: agent.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics, getAgents, createAgent };
