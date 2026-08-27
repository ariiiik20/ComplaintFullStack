const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Submit feedback for a resolved complaint
 * @route   POST /api/feedback
 * @access  USER
 */
const createFeedback = async (req, res, next) => {
  try {
    const { complaintId, rating, comments } = req.body;

    // Check complaint exists and belongs to user
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    if (complaint.user.toString() !== req.user.id) {
      return next(new ApiError('You can only provide feedback for your own complaints', 403));
    }

    // Only allow feedback on resolved complaints
    if (complaint.status !== 'Resolved') {
      return next(new ApiError('Feedback can only be submitted for resolved complaints', 400));
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ complaint: complaintId });
    if (existingFeedback) {
      return next(new ApiError('Feedback has already been submitted for this complaint', 400));
    }

    const feedback = await Feedback.create({
      complaint: complaintId,
      user: req.user.id,
      rating,
      comments,
    });

    await feedback.populate([
      { path: 'complaint', select: 'title category' },
      { path: 'user', select: 'name email' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get feedback statistics (Admin)
 * @route   GET /api/feedback/stats
 * @access  ADMIN
 */
const getFeedbackStats = async (req, res, next) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalFeedbacks: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
        },
      },
    ]);

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats.length > 0) {
      stats[0].ratingDistribution.forEach((r) => {
        distribution[r] = (distribution[r] || 0) + 1;
      });
    }

    // Recent feedbacks
    const recentFeedbacks = await Feedback.find()
      .populate('complaint', 'title category')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        averageRating: stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0,
        totalFeedbacks: stats.length > 0 ? stats[0].totalFeedbacks : 0,
        distribution,
      },
      recentFeedbacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all feedback records (Admin)
 * @route   GET /api/feedback
 * @access  ADMIN
 */
const getAllFeedbacks = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('complaint', 'title category status priority')
      .populate('user', 'name email department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createFeedback, getFeedbackStats, getAllFeedbacks };
