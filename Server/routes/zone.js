const express = require("express");
const router = express.Router();

const zoneController = require("../controllers/zone.controller");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");

router.use(authCheck, adminOnly);

router.get("/", zoneController.list);
router.post("/", zoneController.create);
router.put("/:id", zoneController.update);
router.delete("/:id", zoneController.remove);

module.exports = router;