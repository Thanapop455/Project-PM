const dashboardService = require("../services/dashboard");

exports.summary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary({ role: req.user.role });
    res.json(summary);
  } catch (error) {
    next(error);
  }
};
