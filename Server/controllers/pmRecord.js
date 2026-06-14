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
    const result = await pmRecordService.create(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getByDevice = async (req, res, next) => {
  try {
    const records = await pmRecordService.getByDevice(req.params.deviceId);
    res.json(records);
  } catch (error) {
    next(error);
  }
};