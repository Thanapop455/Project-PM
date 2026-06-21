const deviceService = require("../services/device");

exports.list = async (req, res, next) => {
  try {
    const devices = await deviceService.list(req.query);
    res.json(devices);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const device = await deviceService.create(req.body);
    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const device = await deviceService.update(req.params.id, req.body);
    res.json(device);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await deviceService.remove(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
