const express = require("express");
const router = express.Router();

const deviceController = require("../controllers/device");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");

router.use(authCheck, adminOnly);

router.get("/", deviceController.list);
router.get("/:id", deviceController.getById);
router.post("/", deviceController.create);
router.put("/:id", deviceController.update);
router.delete("/:id", deviceController.remove);

module.exports = router;