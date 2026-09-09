const mongoose = require('mongoose');
const { BOOK_STATUSES } = require('../constants');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Author cannot exceed 100 characters']
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    publisher: {
      type: String,
      trim: true,
      default: ''
    },
    publicationYear: {
      type: Number,
      min: [1000, 'Invalid publication year'],
      max: [new Date().getFullYear() + 1, 'Publication year cannot be in the future']
    },
    totalCopies: {
      type: Number,
      required: [true, 'Total copies count is required'],
      min: [1, 'Total copies must be at least 1']
    },
    availableCopies: {
      type: Number,
      required: [true, 'Available copies count is required'],
      min: [0, 'Available copies cannot be negative']
    },
    lostCopies: {
      type: Number,
      default: 0,
      min: [0, 'Lost copies cannot be negative']
    },
    damagedCopies: {
      type: Number,
      default: 0,
      min: [0, 'Damaged copies cannot be negative']
    },
    coverImage: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BOOK_STATUSES),
        message: 'Invalid book status: {VALUE}'
      },
      default: BOOK_STATUSES.AVAILABLE
    },
    borrowCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes
bookSchema.index({ title: 'text', author: 'text', category: 'text' });
bookSchema.index({ category: 1 });
bookSchema.index({ availableCopies: 1 });
bookSchema.index({ status: 1 });
bookSchema.index({ borrowCount: -1 });

// Pre-save validation for copy consistency
bookSchema.pre('save', function (next) {
  if (this.availableCopies > this.totalCopies) {
    return next(new Error('Available copies cannot exceed total copies'));
  }
  if (this.availableCopies + this.lostCopies + this.damagedCopies > this.totalCopies) {
    return next(new Error('Sum of available, lost, and damaged copies cannot exceed total copies'));
  }
  next();
});

module.exports = mongoose.model('Book', bookSchema);
