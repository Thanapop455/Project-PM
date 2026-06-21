const prisma = require("../config/prisma");
const { getTodayDate } = require("../utils/date");

const PM_ALERT_AUTO_TYPE = "PM_ALERT_AUTO";

const getAutoAlertDate = () => getTodayDate();

const getAutoAlertLog = async (alertDate = getAutoAlertDate()) =>
  prisma.alertLog.findUnique({
    where: {
      alertDate_type: {
        alertDate,
        type: PM_ALERT_AUTO_TYPE,
      },
    },
  });

const startAutoAlertLog = async (alertDate = getAutoAlertDate()) => {
  try {
    return await prisma.alertLog.create({
      data: {
        alertDate,
        type: PM_ALERT_AUTO_TYPE,
        status: "RUNNING",
        message: "Auto PM alert started",
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return null;
    }

    throw error;
  }
};

const finishAutoAlertLog = async (id, result) => {
  const status = result.sent
    ? "SENT"
    : result.message === "No PM alerts to send"
      ? "NO_ALERTS"
      : "SKIPPED";

  return prisma.alertLog.update({
    where: {
      id,
    },
    data: {
      status,
      message: result.message,
      channelsJson: JSON.stringify(result.channels || {}),
    },
  });
};

const failAutoAlertLog = async (id, error) =>
  prisma.alertLog.update({
    where: {
      id,
    },
    data: {
      status: "FAILED",
      message: error.message.slice(0, 500),
    },
  });

const recordManualAlertResult = async (result, alertDate = getAutoAlertDate()) => {
  const status = result.sent
    ? "SENT_MANUAL"
    : result.message === "No PM alerts to send"
      ? "NO_ALERTS"
      : "MANUAL_SKIPPED";

  return prisma.alertLog.upsert({
    where: {
      alertDate_type: {
        alertDate,
        type: PM_ALERT_AUTO_TYPE,
      },
    },
    update: {
      status,
      message: result.message,
      channelsJson: JSON.stringify(result.channels || {}),
    },
    create: {
      alertDate,
      type: PM_ALERT_AUTO_TYPE,
      status,
      message: result.message,
      channelsJson: JSON.stringify(result.channels || {}),
    },
  });
};

module.exports = {
  PM_ALERT_AUTO_TYPE,
  failAutoAlertLog,
  finishAutoAlertLog,
  getAutoAlertDate,
  getAutoAlertLog,  
  recordManualAlertResult,
  startAutoAlertLog,
};
