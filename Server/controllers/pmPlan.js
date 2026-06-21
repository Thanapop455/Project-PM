const pmPlanService = require("../services/pmPlan");
const notificationService = require("../services/notification");
const alertLogService = require("../services/alertLog");

exports.list = async (req, res, next) => {
  try {
    const plans = await pmPlanService.list(req.query);
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const result = await pmPlanService.generate(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
exports.undoGenerate = async (req, res, next) => {
  try {
    const result = await pmPlanService.undoGenerate(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.years = async (req, res, next) => {
  try {
    const years = await pmPlanService.getAvailableYears();
    res.json(years);
  } catch (error) {
    next(error);
  }
};

exports.alerts = async (req, res, next) => {
  try {
    const alerts = await pmPlanService.getAlerts();
    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

exports.filterOptions = async (req, res, next) => {
  try {
    const options = await pmPlanService.getFilterOptions();
    res.json(options);
  } catch (error) {
    next(error);
  }
};

exports.alertStatus = async (req, res, next) => {
  try {
    const log = await alertLogService.getAutoAlertLog();
    res.json({
      sentToday: ["SENT", "SENT_MANUAL"].includes(log?.status),
      log,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendAlerts = async (req, res, next) => {
  try {
    const result = await notificationService.sendPMAlerts();
    await alertLogService.recordManualAlertResult(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
