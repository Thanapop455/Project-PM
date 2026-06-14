const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const deviceGroupRoute = require("./routes/deviceGroup");
const deviceTypeRoute = require("./routes/deviceType");
const brandRoute = require("./routes/brand");
const deviceModelRoute = require("./routes/deviceModel");
const zoneRoute = require("./routes/zone");
const pmPolicyRoute = require("./routes/pmPolicy");
const pmPlanRoute = require("./routes/pmPlan");
const pmRecordRoute = require("./routes/pmRecord");
const reportRoute = require("./routes/report");

const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "PM System API is running" });
});

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/device-groups", deviceGroupRoute);
app.use("/api/device-types", deviceTypeRoute);
app.use("/api/brands", brandRoute);
app.use("/api/device-models", deviceModelRoute);
app.use("/api/zones", zoneRoute);
app.use("/api/pm-policies", pmPolicyRoute);
app.use("/api/pm-plans", pmPlanRoute);
app.use("/api/pm-records", pmRecordRoute);
app.use("/api/reports", reportRoute);

app.use(errorHandler);

module.exports = app;