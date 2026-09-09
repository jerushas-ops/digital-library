/**
 * Generate unique membership identifier in format: LIB-YYYY-XXXXX
 * e.g., LIB-2026-00101
 */
const generateMemberId = () => {
  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `LIB-${currentYear}-${randomSuffix}`;
};

module.exports = generateMemberId;
