const express = require("express");
const router = express.Router();

const reportController = require("../controllers/report");
const authCheck = require("../middlewares/authCheck");
const staffOnly = require("../middlewares/staffOnly");

router.use(authCheck, staffOnly);

router.get("/devices", reportController.reportDevices);

router.get("/pm-plan", reportController.pmPlanReport);
router.get("/pm-history", reportController.pmHistoryReport);
router.get("/pm-cost", reportController.pmCostReport);

router.get("/pm-plan/export", reportController.exportPMPlanReport);
router.get("/pm-history/export", reportController.exportPMHistoryReport);
router.get("/pm-cost/export", reportController.exportPMCostReport);

module.exports = router;
