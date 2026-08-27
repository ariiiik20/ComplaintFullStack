const Message = require('../models/Message');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Send a message on a complaint thread
 * @route   POST /api/messages or POST /api/messages/:complaintId
 * @access  Protected (User Creator, Assigned Agent, or Admin)
 */
const createMessage = async (req, res, next) => {
  try {
    const complaintId = req.params.complaintId || req.body.complaintId || req.body.complaintRef;
    const { text } = req.body;

    if (!complaintId) {
      return next(new ApiError('Complaint ID is required', 400));
    }

    if (!text || !text.trim()) {
      return next(new ApiError('Message text cannot be empty', 400));
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    const currentUserId = (req.user.id || req.user._id).toString();

    // Check authorization: Must be creator, assigned agent, or admin
    const creatorId = (complaint.creator || complaint.user)?.toString();
    const assignedAgentId = complaint.assignedAgent?.toString();
    const isAdmin = req.user.role === 'ADMIN';

    const isAuthorized =
      isAdmin ||
      (creatorId && creatorId === currentUserId) ||
      (assignedAgentId && assignedAgentId === currentUserId);

    if (!isAuthorized) {
      return next(
        new ApiError('Not authorized to send messages on this complaint ticket', 403)
      );
    }

    const message = await Message.create({
      complaintRef: complaintId,
      sender: req.user.id || req.user._id,
      text: text.trim(),
    });

    await message.populate('sender', 'name email role department');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all messages for a complaint thread
 * @route   GET /api/messages/:complaintId
 * @access  Protected (User Creator, Assigned Agent, or Admin)
 */
const getMessagesByComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    if (!complaintId) {
      return next(new ApiError('Complaint ID is required', 400));
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    const currentUserId = (req.user.id || req.user._id).toString();

    const creatorId = (complaint.creator || complaint.user)?.toString();
    const assignedAgentId = complaint.assignedAgent?.toString();
    const isAdmin = req.user.role === 'ADMIN';

    const isAuthorized =
      isAdmin ||
      (creatorId && creatorId === currentUserId) ||
      (assignedAgentId && assignedAgentId === currentUserId);

    if (!isAuthorized) {
      return next(
        new ApiError('Not authorized to view messages for this complaint ticket', 403)
      );
    }

    const messages = await Message.find({ complaintRef: complaintId })
      .populate('sender', 'name email role department')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMessage,
  getMessagesByComplaint,
};
