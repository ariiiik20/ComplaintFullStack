const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Exclude password from queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['USER', 'AGENT', 'ADMIN'],
        message: '{VALUE} is not a valid role',
      },
      default: 'USER',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [15, 'Phone number cannot exceed 15 characters'],
    },
    contactNumber: {
      type: String,
      trim: true,
      maxlength: [15, 'Contact number cannot exceed 15 characters'],
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Synchronize phone and contactNumber fields
userSchema.pre('save', function (next) {
  if (this.phone && !this.contactNumber) {
    this.contactNumber = this.phone;
  }
  if (this.contactNumber && !this.phone) {
    this.phone = this.contactNumber;
  }
  next();
});

// Index for fast role lookups (email index is auto-created by unique: true)
userSchema.index({ role: 1 });

// Hash password before saving using bcryptjs (salt factor 10)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
