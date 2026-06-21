const express = require("express");
const router = express.Router();

const pmPlanController = require("../controllers/pmPlan");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");
const staffOnly = require("../middlewares/staffOnly");

router.get("/", authCheck, staffOnly, pmPlanController.list);
router.get("/years", authCheck, staffOnly, pmPlanController.years);
router.get("/alerts", authCheck, staffOnly, pmPlanController.alerts);
router.get("/alerts/status", authCheck, adminOnly, pmPlanController.alertStatus);
router.get("/filter-options", authCheck, staffOnly, pmPlanController.filterOptions);
router.post("/alerts/send", authCheck, adminOnly, pmPlanController.sendAlerts);

router.post("/generate", authCheck, adminOnly, pmPlanController.generate);
router.put("/undo-generate", authCheck, adminOnly, pmPlanController.undoGenerate);

module.exports = router;
