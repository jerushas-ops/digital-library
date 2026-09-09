const validateMembershipPlan = (req) => {
  const errors = [];
  const { name, maximumBooks, loanDurationDays, finePerDay, reservationLimit, fineThreshold } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Plan name is required' });
  }

  if (maximumBooks === undefined || isNaN(Number(maximumBooks)) || Number(maximumBooks) < 1) {
    errors.push({ field: 'maximumBooks', message: 'Maximum books must be at least 1' });
  }

  if (loanDurationDays === undefined || isNaN(Number(loanDurationDays)) || Number(loanDurationDays) < 1) {
    errors.push({ field: 'loanDurationDays', message: 'Loan duration days must be at least 1' });
  }

  if (finePerDay === undefined || isNaN(Number(finePerDay)) || Number(finePerDay) < 0) {
    errors.push({ field: 'finePerDay', message: 'Fine per day cannot be negative' });
  }

  if (reservationLimit !== undefined && (isNaN(Number(reservationLimit)) || Number(reservationLimit) < 0)) {
    errors.push({ field: 'reservationLimit', message: 'Reservation limit cannot be negative' });
  }

  if (fineThreshold !== undefined && (isNaN(Number(fineThreshold)) || Number(fineThreshold) < 0)) {
    errors.push({ field: 'fineThreshold', message: 'Fine threshold cannot be negative' });
  }

  return errors;
};

module.exports = {
  validateMembershipPlan
};
