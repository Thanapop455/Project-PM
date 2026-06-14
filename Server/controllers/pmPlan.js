const pmPlanService = require("../services/pmPlan");

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

exports.alerts = async (req, res, next) => {
  try {
    const alerts = await pmPlanService.getAlerts();
    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const plan = await pmPlanService.cancel(req.params.id);
    res.json(plan);
  } catch (error) {
    next(error);
  }
};