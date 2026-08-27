const Complaint = require('../models/Complaint');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  sendSubmissionConfirmation,
  sendAssignmentAlert,
  sendStatusUpdateAlert,
} = require('../utils/nodemailer');

/**
 * @desc    Create a new complaint
 * @route   POST /api/complaints
 * @access  USER (or authenticated users)
 */
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, priority } = req.body;

    let attachmentPaths = [];

    // Process files uploaded via Multer
    if (req.files && req.files.length > 0) {
      attachmentPaths = req.files.map((file) => `/uploads/${file.filename}`);
    } else if (req.body.attachments) {
      if (Array.isArray(req.body.attachments)) {
        attachmentPaths = req.body.attachments;
      } else if (typeof req.body.attachments === 'string') {
        try {
          const parsed = JSON.parse(req.body.attachments);
          attachmentPaths = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          attachmentPaths = [req.body.attachments];
        }
      }
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'Medium',
      creator: req.user.id || req.user._id,
      user: req.user.id || req.user._id,
      attachments: attachmentPaths,
      auditTrail: [
        {
          status: 'Pending',
          updatedBy: req.user.id || req.user._id,
          remark: 'Complaint submitted',
        },
      ],
    });

    await complaint.populate([
      { path: 'creator', select: 'name email' },
      { path: 'user', select: 'name email' },
    ]);

    // Send confirmation email asynchronously
    sendSubmissionConfirmation(req.user, complaint);

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complaints created by current user
 * @route   GET /api/complaints/my or GET /api/complaints/my-complaints
 * @access  USER
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;

    const userId = req.user.id || req.user._id;
    const query = {
      $or: [{ creator: userId }, { user: userId }],
    };

    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('assignedAgent', 'name email department phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Complaint.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      complaints,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complaint by ID
 * @route   GET /api/complaints/:id
 * @access  USER (own), AGENT (assigned), ADMIN (all)
 */
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('creator', 'name email department phone contactNumber')
      .populate('user', 'name email department phone contactNumber')
      .populate('assignedAgent', 'name email department phone')
      .populate('auditTrail.updatedBy', 'name role');

    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    const currentUserId = (req.user.id || req.user._id).toString();

    // Authorization checks
    if (req.user.role === 'USER') {
      const creatorId = (complaint.creator?._id || complaint.user?._id || complaint.creator || complaint.user)?.toString();
      if (creatorId !== currentUserId) {
        return next(new ApiError('Not authorized to view this complaint', 403));
      }
    }

    if (req.user.role === 'AGENT') {
      const agentId = (complaint.assignedAgent?._id || complaint.assignedAgent)?.toString();
      if (!agentId || agentId !== currentUserId) {
        return next(new ApiError('Not authorized to view this complaint', 403));
      }
    }

    res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complaints assigned to current agent
 * @route   GET /api/complaints/assigned
 * @access  AGENT
 */
const getAssignedComplaints = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;

    const agentId = req.user.id || req.user._id;
    const query = { assignedAgent: agentId };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('creator', 'name email department phone')
        .populate('user', 'name email department phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Complaint.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      complaints,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all complaints for Admin with filters & pagination
 * @route   GET /api/complaints/all or GET /api/complaints
 * @access  ADMIN
 */
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, page = 1, limit = 10, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('creator', 'name email department phone')
        .populate('user', 'name email department phone')
        .populate('assignedAgent', 'name email department phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Complaint.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      complaints,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign agent to a complaint
 * @route   PATCH /api/complaints/:id/assign or PUT /api/complaints/:id/assign
 * @access  ADMIN
 */
const assignAgent = async (req, res, next) => {
  try {
    const agentId = req.body.agentId || req.body.assignedAgent;

    if (!agentId) {
      return next(new ApiError('Agent ID is required for assignment', 400));
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'AGENT') {
      return next(new ApiError('Invalid agent — user not found or not an AGENT', 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    complaint.assignedAgent = agentId;

    if (complaint.status === 'Pending') {
      complaint.status = 'In Progress';
      complaint.auditTrail.push({
        status: 'In Progress',
        updatedBy: req.user.id || req.user._id,
        remark: `Assigned to agent: ${agent.name}`,
      });
    } else {
      complaint.auditTrail.push({
        status: complaint.status,
        updatedBy: req.user.id || req.user._id,
        remark: `Reassigned to agent: ${agent.name}`,
      });
    }

    await complaint.save();

    await complaint.populate([
      { path: 'creator', select: 'name email' },
      { path: 'user', select: 'name email' },
      { path: 'assignedAgent', select: 'name email department' },
    ]);

    // Send assignment alert email to Agent
    sendAssignmentAlert(agent, complaint);

    res.status(200).json({
      success: true,
      message: `Complaint assigned to ${agent.name}`,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update complaint status
 * @route   PATCH /api/complaints/:id/status or PUT /api/complaints/:id/status
 * @access  AGENT / ADMIN
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, remark } = req.body;

    if (!status) {
      return next(new ApiError('Status is required', 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    const currentUserId = (req.user.id || req.user._id).toString();

    // AGENT can only update complaints assigned to them
    if (req.user.role === 'AGENT') {
      const assignedId = complaint.assignedAgent?.toString();
      if (!assignedId || assignedId !== currentUserId) {
        return next(new ApiError('You are not assigned to handle this complaint', 403));
      }
    }

    const oldStatus = complaint.status;
    complaint.status = status;
    complaint.auditTrail.push({
      status,
      updatedBy: req.user.id || req.user._id,
      remark: remark || `Status changed from ${oldStatus} to ${status}`,
    });

    await complaint.save();

    await complaint.populate([
      { path: 'creator', select: 'name email' },
      { path: 'user', select: 'name email' },
      { path: 'assignedAgent', select: 'name email' },
      { path: 'auditTrail.updatedBy', select: 'name role' },
    ]);

    // Send status update alert email to Creator/User
    const creatorUser = complaint.creator || complaint.user;
    if (creatorUser) {
      sendStatusUpdateAlert(creatorUser, complaint, oldStatus, status);
    }

    res.status(200).json({
      success: true,
      message: `Complaint status updated from '${oldStatus}' to '${status}'`,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Escalate complaint / request reassignment
 * @route   PATCH /api/complaints/:id/escalate or PUT /api/complaints/:id/escalate
 * @access  AGENT
 */
const escalateComplaint = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    const currentUserId = (req.user.id || req.user._id).toString();
    const assignedId = complaint.assignedAgent?.toString();

    if (req.user.role === 'AGENT' && assignedId !== currentUserId) {
      return next(new ApiError('You are not assigned to handle this complaint', 403));
    }

    complaint.isEscalated = true;
    complaint.auditTrail.push({
      status: complaint.status,
      updatedBy: req.user.id || req.user._id,
      remark: `ESCALATION / REASSIGNMENT REQUEST: ${reason || 'Escalated by agent'}`,
    });

    await complaint.save();

    await complaint.populate([
      { path: 'creator', select: 'name email' },
      { path: 'user', select: 'name email' },
      { path: 'assignedAgent', select: 'name email department' },
      { path: 'auditTrail.updatedBy', select: 'name role' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Complaint escalated successfully. Admin notified for reassignment.',
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAssignedComplaints,
  getAllComplaints,
  assignAgent,
  updateComplaintStatus,
  escalateComplaint,
};
