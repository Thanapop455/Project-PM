const express = require("express");
const router = express.Router();

const pmRecordController = require("../controllers/pmRecord");
const authCheck = require("../middlewares/authCheck");
const staffOnly = require("../middlewares/staffOnly");

router.use(authCheck, staffOnly);

router.get("/", pmRecordController.list);
router.post("/", pmRecordController.create);

module.exports = router;
