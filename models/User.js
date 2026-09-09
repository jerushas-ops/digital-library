const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, MEMBER_TYPES, USER_STATUSES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return passwordHash in standard queries
    },
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid role: {VALUE}'
      },
      default: ROLES.MEMBER
    },
    memberType: {
      type: String,
      enum: {
        values: Object.values(MEMBER_TYPES),
        message: 'Invalid member type: {VALUE}'
      },
      default: MEMBER_TYPES.STUDENT
    },
    membershipId: {
      type: String,
      required: [true, 'Membership ID is required'],
      unique: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: Object.values(USER_STATUSES),
        message: 'Invalid account status: {VALUE}'
      },
      default: USER_STATUSES.ACTIVE
    },
    membershipPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      default: null
    },
    outstandingFines: {
      type: Number,
      default: 0,
      min: [0, 'Outstanding fines cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
userSchema.index({ role: 1, status: 1 });

// Password comparison method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Remove passwordHash from JSON responses
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
