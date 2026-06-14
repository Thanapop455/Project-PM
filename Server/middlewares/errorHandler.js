const errorHandler = (err, req, res, next) => {
  console.log(err);

  if (err.code === "P2002") {
    return res.status(400).json({
      message: "Duplicate data",
      target: err.meta?.target,
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      message: "Cannot delete because this data is being used",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      message: "Data not found",
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "Server Error",
  });
};

module.exports = errorHandler;