const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const Hold = require('../models/Hold');
const LibrarySetting = require('../models/LibrarySetting');
const AuditLog = require('../models/AuditLog');
const MembershipPlan = require('../models/MembershipPlan');
const generateMemberId = require('../utils/generateMemberId');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../utils/customErrors');
const { ROLES, USER_STATUSES, TRANSACTION_STATUSES, ERROR_CODES } = require('../constants');
const { logAudit } = require('../services/auditService');

/**
 * Get users list with filtering & pagination (Admin only)
 * GET /api/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, status, memberType, search } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (memberType) filter.memberType = memberType;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { membershipId: regex }, { phone: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('membershipPlanId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter)
    ]);

    return paginatedResponse(res, 'Users list retrieved successfully', users, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user status (ACTIVE, INACTIVE, SUSPENDED)
 * PUT /api/admin/users/:id/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !Object.values(USER_STATUSES).includes(status)) {
      throw new BadRequestError(`Invalid status. Allowed: ${Object.values(USER_STATUSES).join(', ')}`);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Protect self-deactivation of logged in admin
    if (user._id.toString() === req.user._id.toString() && status !== USER_STATUSES.ACTIVE) {
      throw new ForbiddenError('You cannot deactivate your own administrative account.');
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    await logAudit({
      actorId: req.user._id,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: user._id,
      metadata: { oldStatus, newStatus: status, userEmail: user.email },
      ipAddress: req.ip
    });

    return successResponse(res, `User status updated to ${status}`, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role
 * PUT /api/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !Object.values(ROLES).includes(role)) {
      throw new BadRequestError(`Invalid role. Allowed: ${Object.values(ROLES).join(', ')}`);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Protect root admin from downgrading self
    if (user._id.toString() === req.user._id.toString() && role !== ROLES.ADMIN) {
      throw new ForbiddenError('You cannot demote your own administrative role.');
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAudit({
      actorId: req.user._id,
      action: 'USER_ROLE_CHANGED',
      resource: 'User',
      resourceId: user._id,
      metadata: { oldRole, newRole: role, userEmail: user.email },
      ipAddress: req.ip
    });

    return successResponse(res, `User role updated to ${role}`, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign membership plan to user
 * PUT /api/admin/users/:id/plan
 */
const updateUserPlan = async (req, res, next) => {
  try {
    const { membershipPlanId } = req.body;
    const plan = await MembershipPlan.findById(membershipPlanId);
    if (!plan) {
      throw new NotFoundError('Membership plan not found');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.membershipPlanId = plan._id;
    await user.save();

    const populated = await User.findById(user._id).populate('membershipPlanId');

    await logAudit({
      actorId: req.user._id,
      action: 'USER_PLAN_UPDATED',
      resource: 'User',
      resourceId: user._id,
      metadata: { planName: plan.name },
      ipAddress: req.ip
    });

    return successResponse(res, `Membership plan updated to ${plan.name}`, { user: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Librarian account
 * POST /api/admin/librarians
 */
const createLibrarian = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      throw new BadRequestError('Name, email, and password are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ConflictError(`User with email '${normalizedEmail}' already exists.`, ERROR_CODES.USER_EXISTS);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const membershipId = `LIB-STAFF-${Math.floor(1000 + Math.random() * 9000)}`;

    const librarian = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: ROLES.LIBRARIAN,
      membershipId,
      phone: phone ? phone.trim() : '',
      status: USER_STATUSES.ACTIVE
    });

    await logAudit({
      actorId: req.user._id,
      action: 'LIBRARIAN_ACCOUNT_CREATED',
      resource: 'User',
      resourceId: librarian._id,
      metadata: { email: librarian.email, name: librarian.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Librarian account created successfully', { librarian }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get library settings
 * GET /api/admin/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await LibrarySetting.find().sort({ key: 1 });
    return successResponse(res, 'Settings retrieved successfully', { settings });
  } catch (error) {
    next(error);
  }
};

/**
 * Update or create a library setting
 * PUT /api/admin/settings
 */
const updateSetting = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      throw new BadRequestError('Setting key and value are required');
    }

    const setting = await LibrarySetting.findOneAndUpdate(
      { key: key.toUpperCase().trim() },
      {
        key: key.toUpperCase().trim(),
        value,
        description: description || '',
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    await logAudit({
      actorId: req.user._id,
      action: 'SETTING_UPDATED',
      resource: 'LibrarySetting',
      resourceId: setting._id,
      metadata: { key: setting.key, value: setting.value },
      ipAddress: req.ip
    });

    return successResponse(res, `Setting '${setting.key}' saved successfully`, { setting });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit Logs
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action, resource } = req.query;

    const filter = {};
    if (action) filter.action = { $regex: new RegExp(action.trim(), 'i') };
    if (resource) filter.resource = resource;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(filter)
    ]);

    return paginatedResponse(res, 'Audit logs retrieved successfully', logs, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Admin Executive Dashboard Overview
 * GET /api/admin/overview
 */
const getAdminOverview = async (req, res, next) => {
  try {
    const [
      totalMembers,
      totalLibrarians,
      totalBooks,
      activeTransactions,
      overdueTransactions,
      pendingHolds
    ] = await Promise.all([
      User.countDocuments({ role: ROLES.MEMBER }),
      User.countDocuments({ role: ROLES.LIBRARIAN }),
      Book.countDocuments(),
      Transaction.countDocuments({ status: TRANSACTION_STATUSES.ACTIVE }),
      Transaction.countDocuments({ status: TRANSACTION_STATUSES.ACTIVE, dueDate: { $lt: new Date() } }),
      Hold.countDocuments({ status: 'WAITING' })
    ]);

    return successResponse(res, 'Admin overview stats retrieved', {
      totalMembers,
      totalLibrarians,
      totalBooks,
      activeTransactions,
      overdueTransactions,
      pendingHolds
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  updateUserRole,
  updateUserPlan,
  createLibrarian,
  getSettings,
  updateSetting,
  getAuditLogs,
  getAdminOverview
};
