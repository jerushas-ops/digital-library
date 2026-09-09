const Hold = require('../models/Hold');
const { placeHold, cancelHold } = require('../services/holdService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ROLES, HOLD_STATUSES } = require('../constants');

/**
 * Place a reservation hold
 * POST /api/holds
 */
const placeHoldHandler = async (req, res, next) => {
  try {
    const memberId = req.user.role === ROLES.MEMBER ? req.user._id : (req.body.memberId || req.user._id);
    const { bookId } = req.body;

    const result = await placeHold({
      memberId,
      bookId,
      ipAddress: req.ip
    });

    const populated = await Hold.findById(result.hold._id).populate('bookId memberId');

    return successResponse(
      res,
      `Reservation hold placed successfully. You are at position #${result.queuePosition} in the waitlist queue.`,
      {
        hold: populated,
        queuePosition: result.queuePosition
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get holds list with filters and pagination
 * GET /api/holds
 */
const getHolds = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      bookId,
      memberId,
      status,
      sortBy = 'requestedAt',
      sortOrder = 'asc'
    } = req.query;

    const filter = {};

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

    const [holds, total] = await Promise.all([
      Hold.find(filter)
        .populate('bookId', 'title author isbn category coverImage availableCopies totalCopies')
        .populate('memberId', 'name email membershipId phone')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Hold.countDocuments(filter)
    ]);

    return paginatedResponse(res, 'Reservation holds retrieved successfully', holds, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a reservation hold
 * PUT /api/holds/:id/cancel
 */
const cancelHoldHandler = async (req, res, next) => {
  try {
    const hold = await cancelHold({
      holdId: req.params.id,
      userId: req.user._id,
      userRole: req.user.role,
      ipAddress: req.ip
    });

    return successResponse(res, 'Reservation hold cancelled successfully', { hold });
  } catch (error) {
    next(error);
  }
};

/**
 * Get queue for a specific book
 * GET /api/holds/queue/:bookId
 */
const getBookHoldQueue = async (req, res, next) => {
  try {
    const queue = await Hold.find({
      bookId: req.params.bookId,
      status: { $in: [HOLD_STATUSES.WAITING, HOLD_STATUSES.READY] }
    })
      .populate('memberId', 'name email membershipId')
      .sort({ requestedAt: 1 });

    return successResponse(res, 'Book reservation queue retrieved', { queue, count: queue.length });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placeHoldHandler,
  getHolds,
  cancelHoldHandler,
  getBookHoldQueue
};
