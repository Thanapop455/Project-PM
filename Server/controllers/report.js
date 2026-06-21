const reportService = require("../services/report");

const sendExcel = async (res, workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName}"`
  );

  res.send(buffer);
};

exports.pmPlanReport = async (req, res, next) => {
  try {
    const report = await reportService.getPMPlanReport(req.query);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

exports.pmHistoryReport = async (req, res, next) => {
  try {
    const report = await reportService.getPMHistoryReport(req.query);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

exports.pmCostReport = async (req, res, next) => {
  try {
    const report = await reportService.getPMCostReport(req.query);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

exports.reportDevices = async (req, res, next) => {
  try {
    const devices = await reportService.getReportDevices();
    res.json(devices);
  } catch (error) {
    next(error);
  }
};

exports.exportPMPlanReport = async (req, res, next) => {
  try {
    const workbook = await reportService.createPMPlanExcel(req.query);
    await sendExcel(res, workbook, "pm-plan-report.xlsx");
  } catch (error) {
    next(error);
  }
};

exports.exportPMHistoryReport = async (req, res, next) => {
  try {
    const workbook = await reportService.createPMHistoryExcel(req.query);
    await sendExcel(res, workbook, "pm-log-report.xlsx");
  } catch (error) {
    next(error);
  }
};

exports.exportPMCostReport = async (req, res, next) => {
  try {
    const workbook = await reportService.createPMCostExcel(req.query);
    await sendExcel(res, workbook, "pm-cost-report.xlsx");
  } catch (error) {
    next(error);
  }
};
