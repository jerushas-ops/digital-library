const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Membership plan name is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    maximumBooks: {
      type: Number,
      required: [true, 'Maximum books limit is required'],
      min: [1, 'Maximum books must be at least 1'],
      default: 3
    },
    loanDurationDays: {
      type: Number,
      required: [true, 'Loan duration in days is required'],
      min: [1, 'Loan duration must be at least 1 day'],
      default: 14
    },
    finePerDay: {
      type: Number,
      required: [true, 'Fine per day is required'],
      min: [0, 'Fine per day cannot be negative'],
      default: 5
    },
    reservationLimit: {
      type: Number,
      default: 3,
      min: [0, 'Reservation limit cannot be negative']
    },
    fineThreshold: {
      type: Number,
      default: 20,
      min: [0, 'Fine threshold cannot be negative'],
      description: 'Outstanding fine amount that restricts borrowing'
    },
    borrowingEnabled: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Format clean JSON output
membershipPlanSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
