const express = require("express");
const router = express.Router();

const pmPolicyController = require("../controllers/pmPolicy");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");

router.use(authCheck, adminOnly);

router.get("/", pmPolicyController.list);
router.post("/", pmPolicyController.create);
router.put("/:id", pmPolicyController.update);
router.delete("/:id", pmPolicyController.remove);

module.exports = router;