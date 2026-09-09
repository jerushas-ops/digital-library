const MembershipPlan = require('../models/MembershipPlan');
const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/customErrors');
const { ERROR_CODES } = require('../constants');
const { logAudit } = require('../services/auditService');

/**
 * Get all membership plans
 * GET /api/membership-plans
 */
const getPlans = async (req, res, next) => {
  try {
    const plans = await MembershipPlan.find().sort({ createdAt: 1 });
    return successResponse(res, 'Membership plans retrieved successfully', { plans });
  } catch (error) {
    next(error);
  }
};

/**
 * Get plan by ID
 * GET /api/membership-plans/:id
 */
const getPlanById = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      throw new NotFoundError('Membership plan not found', ERROR_CODES.NOT_FOUND);
    }
    return successResponse(res, 'Membership plan retrieved successfully', { plan });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new membership plan
 * POST /api/membership-plans
 */
const createPlan = async (req, res, next) => {
  try {
    const {
      name,
      maximumBooks,
      loanDurationDays,
      finePerDay,
      reservationLimit,
      fineThreshold,
      borrowingEnabled = true,
      description,
      isDefault = false
    } = req.body;

    const normalizedName = name.toUpperCase().trim();

    const existing = await MembershipPlan.findOne({ name: normalizedName });
    if (existing) {
      throw new ConflictError(`Membership plan '${normalizedName}' already exists.`, ERROR_CODES.CONFLICT);
    }

    if (isDefault) {
      await MembershipPlan.updateMany({}, { isDefault: false });
    }

    const plan = await MembershipPlan.create({
      name: normalizedName,
      maximumBooks: Number(maximumBooks),
      loanDurationDays: Number(loanDurationDays),
      finePerDay: Number(finePerDay),
      reservationLimit: reservationLimit !== undefined ? Number(reservationLimit) : 3,
      fineThreshold: fineThreshold !== undefined ? Number(fineThreshold) : 20,
      borrowingEnabled,
      description: description ? description.trim() : '',
      isDefault
    });

    await logAudit({
      actorId: req.user._id,
      action: 'MEMBERSHIP_PLAN_CREATED',
      resource: 'MembershipPlan',
      resourceId: plan._id,
      metadata: { name: plan.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Membership plan created successfully', { plan }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a membership plan
 * PUT /api/membership-plans/:id
 */
const updatePlan = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      throw new NotFoundError('Membership plan not found', ERROR_CODES.NOT_FOUND);
    }

    const {
      name,
      maximumBooks,
      loanDurationDays,
      finePerDay,
      reservationLimit,
      fineThreshold,
      borrowingEnabled,
      description,
      isDefault
    } = req.body;

    if (name && name.toUpperCase().trim() !== plan.name) {
      const existing = await MembershipPlan.findOne({ name: name.toUpperCase().trim() });
      if (existing) {
        throw new ConflictError(`Plan name '${name}' already exists.`);
      }
      plan.name = name.toUpperCase().trim();
    }

    if (maximumBooks !== undefined) plan.maximumBooks = Number(maximumBooks);
    if (loanDurationDays !== undefined) plan.loanDurationDays = Number(loanDurationDays);
    if (finePerDay !== undefined) plan.finePerDay = Number(finePerDay);
    if (reservationLimit !== undefined) plan.reservationLimit = Number(reservationLimit);
    if (fineThreshold !== undefined) plan.fineThreshold = Number(fineThreshold);
    if (borrowingEnabled !== undefined) plan.borrowingEnabled = borrowingEnabled;
    if (description !== undefined) plan.description = description.trim();

    if (isDefault !== undefined) {
      if (isDefault) {
        await MembershipPlan.updateMany({ _id: { $ne: plan._id } }, { isDefault: false });
      }
      plan.isDefault = isDefault;
    }

    await plan.save();

    await logAudit({
      actorId: req.user._id,
      action: 'MEMBERSHIP_PLAN_UPDATED',
      resource: 'MembershipPlan',
      resourceId: plan._id,
      metadata: { name: plan.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Membership plan updated successfully', { plan });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a membership plan
 * DELETE /api/membership-plans/:id
 */
const deletePlan = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      throw new NotFoundError('Membership plan not found');
    }

    // Ensure no members are currently assigned
    const assignedMembers = await User.countDocuments({ membershipPlanId: plan._id });
    if (assignedMembers > 0) {
      throw new ConflictError(
        `Cannot delete plan '${plan.name}'. It is currently assigned to ${assignedMembers} active member(s). Reassign them first.`
      );
    }

    await MembershipPlan.findByIdAndDelete(plan._id);

    await logAudit({
      actorId: req.user._id,
      action: 'MEMBERSHIP_PLAN_DELETED',
      resource: 'MembershipPlan',
      resourceId: plan._id,
      metadata: { name: plan.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Membership plan deleted successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
};
