const express = require("express");
const router = express.Router();

const pmPlanController = require("../controllers/pmPlan");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");
const staffOnly = require("../middlewares/staffOnly");

router.get("/", authCheck, staffOnly, pmPlanController.list);
router.get("/alerts", authCheck, staffOnly, pmPlanController.alerts);

router.post("/generate", authCheck, adminOnly, pmPlanController.generate);
router.put("/:id/cancel", authCheck, adminOnly, pmPlanController.cancel);

module.exports = router;