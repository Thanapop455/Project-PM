const express = require("express");
const router = express.Router();

const deviceTypeController = require("../controllers/deviceType.controller");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");

router.use(authCheck, adminOnly);

router.get("/", deviceTypeController.list);
router.post("/", deviceTypeController.create);
router.put("/:id", deviceTypeController.update);
router.delete("/:id", deviceTypeController.remove);

module.exports = router;