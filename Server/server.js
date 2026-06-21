require("dotenv").config();

const app = require("./app");
const { startPMAlertScheduler } = require("./services/alertScheduler");
const {
  startPMPlanAutoGenerateScheduler,
} = require("./services/pmPlanScheduler");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPMAlertScheduler();
  startPMPlanAutoGenerateScheduler();
});
