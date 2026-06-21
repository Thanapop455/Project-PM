const pmRecordService = require("../services/pmRecord");

exports.list = async (req, res, next) => {
  try {
    const records = await pmRecordService.list(req.query);
    res.json(records);
  } catch (error) {
    next(error);
  }
};
exports.create = async (req, res, next) => {
  try {
    const result = await pmRecordService.create(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
