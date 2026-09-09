const {
  getOverdueReport,
  getMostBorrowedReport,
  getInventoryHealthReport,
  getFineSummaryReport,
  getMemberStatsReport,
  getCategoryBorrowingReport
} = require('../services/reportService');
const { successResponse } = require('../utils/apiResponse');

const overdueReportHandler = async (req, res, next) => {
  try {
    const report = await getOverdueReport();
    return successResponse(res, 'Overdue books report generated successfully', { report, count: report.length });
  } catch (error) {
    next(error);
  }
};

const mostBorrowedReportHandler = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const report = await getMostBorrowedReport(limit);
    return successResponse(res, 'Most borrowed books report generated successfully', { report });
  } catch (error) {
    next(error);
  }
};

const inventoryHealthReportHandler = async (req, res, next) => {
  try {
    const report = await getInventoryHealthReport();
    return successResponse(res, 'Inventory health report generated successfully', { report });
  } catch (error) {
    next(error);
  }
};

const finesReportHandler = async (req, res, next) => {
  try {
    const report = await getFineSummaryReport();
    return successResponse(res, 'Fine collection summary report generated successfully', { report });
  } catch (error) {
    next(error);
  }
};

const memberStatsReportHandler = async (req, res, next) => {
  try {
    const report = await getMemberStatsReport();
    return successResponse(res, 'Member borrowing statistics report generated successfully', { report });
  } catch (error) {
    next(error);
  }
};

const categoryReportHandler = async (req, res, next) => {
  try {
    const report = await getCategoryBorrowingReport();
    return successResponse(res, 'Category-wise borrowing report generated successfully', { report });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  overdueReportHandler,
  mostBorrowedReportHandler,
  inventoryHealthReportHandler,
  finesReportHandler,
  memberStatsReportHandler,
  categoryReportHandler
};
