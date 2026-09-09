/**
 * Default Library System Settings
 */

const DEFAULT_SETTINGS = [
  {
    key: 'DEFAULT_FINE_PER_DAY',
    value: 5,
    description: 'Default overdue fine charged per day in currency units'
  },
  {
    key: 'DEFAULT_STUDENT_MAX_BOOKS',
    value: 3,
    description: 'Maximum concurrent active loans permitted for Student members'
  },
  {
    key: 'DEFAULT_STUDENT_LOAN_DAYS',
    value: 14,
    description: 'Standard loan duration in days for Student members'
  },
  {
    key: 'DEFAULT_FACULTY_MAX_BOOKS',
    value: 5,
    description: 'Maximum concurrent active loans permitted for Faculty members'
  },
  {
    key: 'DEFAULT_FACULTY_LOAN_DAYS',
    value: 30,
    description: 'Standard loan duration in days for Faculty members'
  },
  {
    key: 'DEFAULT_FINE_THRESHOLD',
    value: 20,
    description: 'Outstanding fine threshold above which book borrowing is blocked'
  },
  {
    key: 'HOLD_EXPIRATION_HOURS',
    value: 48,
    description: 'Hours after which a READY hold expires if unclaimed'
  },
  {
    key: 'MAX_RESERVATIONS_PER_MEMBER',
    value: 3,
    description: 'Maximum active reservation holds a member can place simultaneously'
  }
];

module.exports = DEFAULT_SETTINGS;
