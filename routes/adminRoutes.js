const express = require('express');
const router = express.Router();
const {
  getUsers,
  updateUserStatus,
  updateUserRole,
  updateUserPlan,
  createLibrarian,
  getSettings,
  updateSetting,
  getAuditLogs,
  getAdminOverview
} = require('../controllers/adminController');
const reportRoutes = require('./reportRoutes');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const validate = require('../middleware/validate');
const { validateMongoId } = require('../validators/bookValidator');
const { ROLES } = require('../constants');

// Guard all admin routes with authentication and Admin role
router.use(authenticateToken);

// Reports are accessible by both Librarian & Admin
router.use('/reports', reportRoutes);

// Strict Admin-only endpoints
router.use(authorizeRoles(ROLES.ADMIN));

router.get('/overview', getAdminOverview);
router.get('/users', getUsers);
router.put('/users/:id/status', validate(validateMongoId('id')), updateUserStatus);
router.put('/users/:id/role', validate(validateMongoId('id')), updateUserRole);
router.put('/users/:id/plan', validate(validateMongoId('id')), updateUserPlan);
router.post('/librarians', createLibrarian);
router.get('/settings', getSettings);
router.put('/settings', updateSetting);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
