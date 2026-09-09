const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange
} = require('../validators/authValidator');

// Public routes
router.post('/register', validate(validateRegister), register);
router.post('/login', validate(validateLogin), login);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, validate(validateProfileUpdate), updateProfile);
router.put('/change-password', authenticateToken, validate(validatePasswordChange), changePassword);

module.exports = router;
