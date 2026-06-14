const express = require("express");
const router = express.Router();

const deviceModelController = require("../controllers/deviceModel.controller");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");

router.use(authCheck, adminOnly);

router.get("/", deviceModelController.list);
router.post("/", deviceModelController.create);
router.put("/:id", deviceModelController.update);
router.delete("/:id", deviceModelController.remove);

module.exports = router;