const FinePayment = require('../models/FinePayment');
const Transaction = require('../models/Transaction');
const { processFinePayment, waiveFine } = require('../services/fineService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ForbiddenError } = require('../utils/customErrors');
const { ROLES, FINE_STATUSES, ERROR_CODES } = require('../constants');

/**
 * Record a fine payment
 * POST /api/fine-payments
 */
const payFineHandler = async (req, res, next) => {
  try {
    const { transactionId, amount, paymentMethod, notes } = req.body;
    const memberId = req.user.role === ROLES.MEMBER ? req.user._id : (req.body.memberId || null);

    const result = await processFinePayment({
      transactionId,
      memberId,
      amount,
      paymentMethod,
      recordedBy: req.user._id,
      notes,
      ipAddress: req.ip
    });

    return successResponse(
      res,
      `Payment of $${Number(amount).toFixed(2)} recorded successfully.`,
      result,
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Waive a fine (Librarian/Admin only)
 * PUT /api/fine-payments/:id/waive
 */
const waiveFineHandler = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { notes } = req.body;

    const result = await waiveFine({
      transactionId,
      recordedBy: req.user._id,
      notes,
      ipAddress: req.ip
    });

    return successResponse(res, 'Fine waived successfully.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get fine payments list
 * GET /api/fine-payments
 */
const getFinePayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      memberId,
      transactionId,
      status,
      sortBy = 'paidAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    if (req.user.role === ROLES.MEMBER) {
      filter.memberId = req.user._id;
    } else if (memberId) {
      filter.memberId = memberId;
    }

    if (transactionId) filter.transactionId = transactionId;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [payments, total] = await Promise.all([
      FinePayment.find(filter)
        .populate('memberId', 'name email membershipId')
        .populate({
          path: 'transactionId',
          select: 'fine finePaid fineStatus issueDate returnDate dueDate',
          populate: { path: 'bookId', select: 'title isbn author' }
        })
        .populate('recordedBy', 'name role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      FinePayment.countDocuments(filter)
    ]);

    return paginatedResponse(res, 'Fine payments retrieved successfully', payments, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Get fines for a specific member
 * GET /api/members/:id/fines
 */
const getMemberFines = async (req, res, next) => {
  try {
    const targetMemberId = req.params.id;

    if (req.user.role === ROLES.MEMBER && req.user._id.toString() !== targetMemberId.toString()) {
      throw new ForbiddenError('You can only view your own fines', ERROR_CODES.FORBIDDEN);
    }

    const [unpaidFines, allFinesWithDetails] = await Promise.all([
      Transaction.find({
        memberId: targetMemberId,
        fine: { $gt: 0 },
        fineStatus: { $in: [FINE_STATUSES.UNPAID, FINE_STATUSES.PARTIALLY_PAID] }
      }).populate('bookId', 'title author isbn coverImage'),

      Transaction.find({
        memberId: targetMemberId,
        fine: { $gt: 0 }
      }).populate('bookId', 'title author isbn coverImage').sort({ createdAt: -1 })
    ]);

    const totalOutstanding = unpaidFines.reduce((acc, curr) => acc + Math.max(0, curr.fine - curr.finePaid), 0);

    return successResponse(res, 'Member fines retrieved successfully', {
      totalOutstanding,
      unpaidLoans: unpaidFines,
      allFineHistory: allFinesWithDetails
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  payFineHandler,
  waiveFineHandler,
  getFinePayments,
  getMemberFines
};
