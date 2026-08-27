const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'],
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    remark: {
      type: String,
      trim: true,
      maxlength: [500, 'Remark cannot exceed 500 characters'],
    },
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ['IT', 'Maintenance', 'Billing', 'Academic', 'General', 'Facility', 'HR', 'Finance'],
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isEscalated: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    auditTrail: [auditEntrySchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to keep creator and user fields in sync
complaintSchema.pre('save', function (next) {
  if (this.creator && !this.user) {
    this.user = this.creator;
  }
  if (this.user && !this.creator) {
    this.creator = this.user;
  }
  next();
});

// Indexes on status, creator, user, and assignedAgent for performance
complaintSchema.index({ status: 1 });
complaintSchema.index({ creator: 1 });
complaintSchema.index({ user: 1 });
complaintSchema.index({ assignedAgent: 1 });
complaintSchema.index({ status: 1, assignedAgent: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
