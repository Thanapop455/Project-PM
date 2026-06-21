const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboard");
const authCheck = require("../middlewares/authCheck");
const staffOnly = require("../middlewares/staffOnly");

router.get("/summary", authCheck, staffOnly, dashboardController.summary);

module.exports = router;
