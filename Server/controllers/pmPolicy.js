const pmPolicyService = require("../services/pmPolicy");

exports.list = async (req, res, next) => {
  try {
    const policies = await pmPolicyService.list(req.query);
    res.json(policies);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const policy = await pmPolicyService.create(req.body);
    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const policy = await pmPolicyService.update(req.params.id, req.body);
    res.json(policy);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await pmPolicyService.remove(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
