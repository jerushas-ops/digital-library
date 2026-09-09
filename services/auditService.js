const AuditLog = require('../models/AuditLog');

/**
 * Audit Logging Service
 */
const logAudit = async ({ actorId = null, action, resource, resourceId = '', metadata = {}, ipAddress = '' }) => {
  try {
    await AuditLog.create({
      actorId,
      action,
      resource,
      resourceId: String(resourceId),
      metadata,
      ipAddress,
      timestamp: new Date()
    });
  } catch (error) {
    // Non-blocking logger: log error to console without breaking main workflow
    console.error('[AuditLog Error]: Failed to create audit entry:', error.message);
  }
};

module.exports = {
  logAudit
};
