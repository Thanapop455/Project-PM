const staffCheck = (req, res, next) => {
  if (!["ADMIN", "STAFF"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Staff only",
    });
  }

  next();
};

module.exports = staffCheck;