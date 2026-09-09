const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { getMemberFines } = require('../controllers/finePaymentController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateMongoId } = require('../validators/bookValidator');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ForbiddenError, NotFoundError } = require('../utils/customErrors');
const { ROLES, ERROR_CODES } = require('../constants');

router.use(authenticateToken);

/**
 * Get member borrowing history
 * GET /api/members/:id/history
 */
router.get('/:id/history', validate(validateMongoId('id')), async (req, res, next) => {
  try {
    const targetMemberId = req.params.id;

    // Check authorization: Members can only access their own history
    if (req.user.role === ROLES.MEMBER && req.user._id.toString() !== targetMemberId.toString()) {
      throw new ForbiddenError(
        'Access denied. Members can only view their own borrowing history.',
        ERROR_CODES.FORBIDDEN
      );
    }

    const member = await User.findById(targetMemberId).populate('membershipPlanId');
    if (!member) {
      throw new NotFoundError('Member not found', ERROR_CODES.NOT_FOUND);
    }

    const { page = 1, limit = 20, status } = req.query;
    const filter = { memberId: targetMemberId };
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('bookId', 'title author isbn category coverImage publisher')
        .populate('issuedBy', 'name role')
        .populate('returnedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: 'Member borrowing history retrieved successfully',
      data: {
        member: {
          _id: member._id,
          name: member.name,
          email: member.email,
          membershipId: member.membershipId,
          memberType: member.memberType,
          status: member.status,
          plan: member.membershipPlanId ? member.membershipPlanId.name : 'STANDARD',
          outstandingFines: member.outstandingFines
        },
        items: transactions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get member fines
 * GET /api/members/:id/fines
 */
router.get('/:id/fines', validate(validateMongoId('id')), getMemberFines);

module.exports = router;
