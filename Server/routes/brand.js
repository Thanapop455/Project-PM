const express = require("express");
const router = express.Router();

const brandController = require("../controllers/brand");
const authCheck = require("../middlewares/authCheck");
const adminOnly = require("../middlewares/adminOnly");

router.use(authCheck, adminOnly);

router.get("/", brandController.list);
router.post("/", brandController.create);
router.put("/:id", brandController.update);
router.delete("/:id", brandController.remove);

module.exports = router;