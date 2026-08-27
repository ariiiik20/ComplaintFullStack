const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    complaintRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      unique: true, // One feedback per complaint
    },
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comments cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to keep complaintRef and complaint fields in sync
feedbackSchema.pre('save', function (next) {
  if (this.complaintRef && !this.complaint) {
    this.complaint = this.complaintRef;
  }
  if (this.complaint && !this.complaintRef) {
    this.complaintRef = this.complaint;
  }
  next();
});

// Index for fast lookups
feedbackSchema.index({ user: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
