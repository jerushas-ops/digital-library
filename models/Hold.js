const mongoose = require('mongoose');
const { HOLD_STATUSES } = require('../constants');

const holdSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required']
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member reference is required']
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: {
        values: Object.values(HOLD_STATUSES),
        message: 'Invalid hold status: {VALUE}'
      },
      default: HOLD_STATUSES.WAITING
    },
    readyAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    fulfilledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
holdSchema.index({ bookId: 1, status: 1, requestedAt: 1 });
holdSchema.index({ memberId: 1, bookId: 1, status: 1 });
holdSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Hold', holdSchema);
