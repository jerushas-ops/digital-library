const express = require('express');
const router = express.Router();
const {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
} = require('../controllers/membershipController');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const validate = require('../middleware/validate');
const { validateMembershipPlan } = require('../validators/planValidator');
const { validateMongoId } = require('../validators/bookValidator');
const { ROLES } = require('../constants');

// Read plans is open
router.get('/', getPlans);
router.get('/:id', validate(validateMongoId('id')), getPlanById);

// Admin plan management
router.post(
  '/',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  validate(validateMembershipPlan),
  createPlan
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  validate(validateMongoId('id')),
  updatePlan
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  validate(validateMongoId('id')),
  deletePlan
);

module.exports = router;
