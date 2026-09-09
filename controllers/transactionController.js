const Transaction = require('../models/Transaction');
const { issueBook, returnBook } = require('../services/transactionService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { ROLES, TRANSACTION_STATUSES, ERROR_CODES } = require('../constants');

/**
 * Issue a book to a member
 * POST /api/transactions/issue
 */
const issueBookHandler = async (req, res, next) => {
  try {
    const { bookId, memberId, notes } = req.body;
    const transaction = await issueBook({
      bookId,
      memberId,
      issuedBy: req.user._id,
      notes,
      ipAddress: req.ip
    });

    return successResponse(res, 'Book issued successfully', { transaction }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Return a borrowed book
 * PUT /api/transactions/:id/return
 */
const returnBookHandler = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { condition = 'GOOD', notes = '' } = req.body;

    const result = await returnBook({
      transactionId,
      returnedBy: req.user._id,
      condition,
      notes,
      ipAddress: req.ip
    });

    return successResponse(
      res,
      result.fine > 0
        ? `Book returned successfully. Overdue fine of $${result.fine.toFixed(2)} applied for ${result.overdueDays} overdue day(s).`
        : 'Book returned successfully in good condition with no fines.',
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get transactions list with filters and pagination
 * GET /api/transactions
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      memberId,
      bookId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    // Members can ONLY query their own transactions
    if (req.user.role === ROLES.MEMBER) {
      filter.memberId = req.user._id;
    } else if (memberId) {
      filter.memberId = memberId;
    }

    if (bookId) filter.bookId = bookId;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('bookId', 'title author isbn category coverImage')
        .populate('memberId', 'name email membershipId memberType')
        .populate('issuedBy', 'name role')
        .populate('returnedBy', 'name role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter)
    ]);

    return paginatedResponse(res, 'Transactions retrieved successfully', transactions, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single transaction by ID
 * GET /api/transactions/:id
 */
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('bookId')
      .populate('memberId', 'name email membershipId phone memberType outstandingFines')
      .populate('issuedBy', 'name role')
      .populate('returnedBy', 'name role');

    if (!transaction) {
      throw new NotFoundError('Transaction record not found', ERROR_CODES.NOT_FOUND);
    }

    if (req.user.role === ROLES.MEMBER && transaction.memberId._id.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You are not authorized to view this transaction', ERROR_CODES.FORBIDDEN);
    }

    return successResponse(res, 'Transaction retrieved successfully', { transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active loans for current user or library-wide
 * GET /api/transactions/active
 */
const getActiveLoans = async (req, res, next) => {
  try {
    const filter = { status: TRANSACTION_STATUSES.ACTIVE };

    if (req.user.role === ROLES.MEMBER) {
      filter.memberId = req.user._id;
    }

    const activeLoans = await Transaction.find(filter)
      .populate('bookId')
      .populate('memberId', 'name email membershipId')
      .sort({ dueDate: 1 });

    return successResponse(res, 'Active loans retrieved successfully', { loans: activeLoans });
  } catch (error) {
    next(error);
  }
};

/**
 * Get overdue loans
 * GET /api/transactions/overdue
 */
const getOverdueLoans = async (req, res, next) => {
  try {
    const now = new Date();
    const filter = {
      status: { $in: [TRANSACTION_STATUSES.ACTIVE, TRANSACTION_STATUSES.OVERDUE] },
      dueDate: { $lt: now }
    };

    if (req.user.role === ROLES.MEMBER) {
      filter.memberId = req.user._id;
    }

    const overdueLoans = await Transaction.find(filter)
      .populate('bookId')
      .populate('memberId', 'name email membershipId phone')
      .sort({ dueDate: 1 });

    return successResponse(res, 'Overdue loans retrieved successfully', { overdueLoans });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  issueBookHandler,
  returnBookHandler,
  getTransactions,
  getTransactionById,
  getActiveLoans,
  getOverdueLoans
};
