const Notification = require('../models/Notification');
const { successResponse } = require('../utils/apiResponse');
const { NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { ERROR_CODES } = require('../constants');

/**
 * Get notifications for authenticated user
 * GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const memberId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ memberId }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ memberId, isRead: false })
    ]);

    return successResponse(res, 'Notifications retrieved successfully', {
      notifications,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 * PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      throw new NotFoundError('Notification not found', ERROR_CODES.NOT_FOUND);
    }

    if (notification.memberId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only modify your own notifications', ERROR_CODES.FORBIDDEN);
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return successResponse(res, 'Notification marked as read', { notification });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all user notifications as read
 * PUT /api/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { memberId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return successResponse(res, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
