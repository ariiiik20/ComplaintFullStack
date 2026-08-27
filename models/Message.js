const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    complaintRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index on complaintRef for fast message thread lookups
messageSchema.index({ complaintRef: 1 });

module.exports = mongoose.model('Message', messageSchema);
