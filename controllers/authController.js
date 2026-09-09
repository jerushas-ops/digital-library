const bcrypt = require('bcryptjs');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');
const { generateToken } = require('../utils/generateToken');
const generateMemberId = require('../utils/generateMemberId');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } = require('../utils/customErrors');
const { ROLES, MEMBER_TYPES, USER_STATUSES, ERROR_CODES } = require('../constants');
const { logAudit } = require('../services/auditService');

/**
 * Register a new Member
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, memberType = MEMBER_TYPES.STUDENT } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user with same email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError(`User with email '${normalizedEmail}' already exists.`, ERROR_CODES.USER_EXISTS);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Assign default membership plan matching memberType or default plan
    let plan = await MembershipPlan.findOne({ name: memberType.toUpperCase() });
    if (!plan) {
      plan = await MembershipPlan.findOne({ isDefault: true });
    }

    // Generate unique Membership ID
    let membershipId = generateMemberId();
    let isUnique = false;
    while (!isUnique) {
      const collision = await User.findOne({ membershipId });
      if (!collision) {
        isUnique = true;
      } else {
        membershipId = generateMemberId();
      }
    }

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: ROLES.MEMBER,
      memberType,
      membershipId,
      phone: phone ? phone.trim() : '',
      status: USER_STATUSES.ACTIVE,
      membershipPlanId: plan ? plan._id : null
    });

    // Generate JWT
    const token = generateToken({
      userId: newUser._id,
      role: newUser.role,
      membershipId: newUser.membershipId,
      email: newUser.email
    });

    await logAudit({
      actorId: newUser._id,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: newUser._id,
      metadata: { email: newUser.email, role: newUser.role, membershipId: newUser.membershipId },
      ipAddress: req.ip
    });

    const populatedUser = await User.findById(newUser._id).populate('membershipPlanId');

    return successResponse(
      res,
      'Member registration successful',
      {
        user: populatedUser,
        token
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login user (Member, Librarian, Admin)
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Query user and explicitly select passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash').populate('membershipPlanId');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.status === USER_STATUSES.INACTIVE) {
      throw new UnauthorizedError('Account is inactive. Please contact the administrator.', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    if (user.status === USER_STATUSES.SUSPENDED) {
      throw new UnauthorizedError('Account is suspended.', ERROR_CODES.ACCOUNT_SUSPENDED);
    }

    const token = generateToken({
      userId: user._id,
      role: user.role,
      membershipId: user.membershipId,
      email: user.email
    });

    await logAudit({
      actorId: user._id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id,
      metadata: { role: user.role },
      ipAddress: req.ip
    });

    const userObj = user.toJSON();

    return successResponse(res, 'Login successful', {
      user: userObj,
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('membershipPlanId');
    return successResponse(res, 'User profile retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    await user.save();
    const updated = await User.findById(user._id).populate('membershipPlanId');

    await logAudit({
      actorId: user._id,
      action: 'PROFILE_UPDATED',
      resource: 'User',
      resourceId: user._id,
      ipAddress: req.ip
    });

    return successResponse(res, 'Profile updated successfully', { user: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect', ERROR_CODES.INVALID_CREDENTIALS);
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAudit({
      actorId: user._id,
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: user._id,
      ipAddress: req.ip
    });

    return successResponse(res, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};
