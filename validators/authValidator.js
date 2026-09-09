const mongoose = require('mongoose');
const { MEMBER_TYPES } = require('../constants');

const validateRegister = (req) => {
  const errors = [];
  const { name, email, password, memberType, phone } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name is required and must be at least 2 characters long' });
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push({ field: 'password', message: 'Password is required and must be at least 6 characters long' });
  }

  if (memberType && !Object.values(MEMBER_TYPES).includes(memberType)) {
    errors.push({ field: 'memberType', message: `Invalid memberType. Allowed: ${Object.values(MEMBER_TYPES).join(', ')}` });
  }

  return errors;
};

const validateLogin = (req) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
};

const validateProfileUpdate = (req) => {
  const errors = [];
  const { name } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  }

  return errors;
};

const validatePasswordChange = (req) => {
  const errors = [];
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword) {
    errors.push({ field: 'currentPassword', message: 'Current password is required' });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    errors.push({ field: 'newPassword', message: 'New password must be at least 6 characters long' });
  }

  return errors;
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange
};
