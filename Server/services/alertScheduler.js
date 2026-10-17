const notificationService = require("./notification");
const alertLogService = require("./alertLog");

let lastSentDate = null;
let timer = null;

const getTodayKey = () => {
  return alertLogService.getAutoAlertDate().toISOString().slice(0, 10);
};

const getTimeKey = () => {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

exports.startPMAlertScheduler = () => {
  if (process.env.PM_ALERT_AUTO_SEND_ENABLED !== "true") {
    return;
  }

  const scheduleTime = process.env.PM_ALERT_SEND_TIME || "08:00";

  timer = setInterval(async () => {
    const todayKey = getTodayKey();

    if (getTimeKey() < scheduleTime || lastSentDate === todayKey) {
      return;
    }

    const alertDate = alertLogService.getAutoAlertDate();

    try {
      const existingLog = await alertLogService.getAutoAlertLog(alertDate);

      if (existingLog) {
        lastSentDate = todayKey;
        console.log(`[PM Alert Scheduler] already handled for ${todayKey}`);
        return;
      }

      const log = await alertLogService.startAutoAlertLog(alertDate);

      if (!log) {
        lastSentDate = todayKey;
        console.log(`[PM Alert Scheduler] already handled for ${todayKey}`);
        return;
      }

      lastSentDate = todayKey;
      const result = await notificationService.sendPMAlerts();
      await alertLogService.finishAutoAlertLog(log.id, result);
      console.log(`[PM Alert Scheduler] ${result.sent ? "sent" : "skipped"}`);
    } catch (error) {
      console.log("[PM Alert Scheduler] failed", error.message);

      const log = await alertLogService.getAutoAlertLog(alertDate);

      if (log?.status === "RUNNING") {
        await alertLogService.failAutoAlertLog(log.id, error);
      }
    }
  }, 60 * 1000);

  console.log(`[PM Alert Scheduler] enabled at ${scheduleTime}`);
};

exports.stopPMAlertScheduler = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
