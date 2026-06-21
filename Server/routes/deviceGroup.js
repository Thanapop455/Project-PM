const express = require("express");
const router = express.Router();

const deviceGroupController = require("../controllers/deviceGroup");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");

router.use(authCheck, adminOnly);

router.get("/", deviceGroupController.list);
router.post("/", deviceGroupController.create);
router.put("/:id", deviceGroupController.update);
router.delete("/:id", deviceGroupController.remove);

module.exports = router;