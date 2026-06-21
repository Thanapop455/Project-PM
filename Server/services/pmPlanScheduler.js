const prisma = require("../config/prisma");
const pmPlanService = require("./pmPlan");

let lastGeneratedYear = null;
let timer = null;

const getTimeKey = (now = new Date()) => {
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
};

const getConfigNumber = (name, fallback, min, max) => {
  const value = Number(process.env[name]);

  if (!Number.isInteger(value) || value < min || value > max) {
    return fallback;
  }

  return value;
};

const hasReachedScheduleDate = (now, scheduleMonth, scheduleDay) => {
  const scheduleDate = new Date(now.getFullYear(), scheduleMonth - 1, scheduleDay);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return today >= scheduleDate;
};

exports.startPMPlanAutoGenerateScheduler = () => {
  if (process.env.PM_PLAN_AUTO_GENERATE_ENABLED !== "true") {
    return;
  }

  const scheduleMonth = getConfigNumber("PM_PLAN_AUTO_GENERATE_MONTH", 12, 1, 12);
  const scheduleDay = getConfigNumber("PM_PLAN_AUTO_GENERATE_DAY", 1, 1, 31);
  const scheduleTime = process.env.PM_PLAN_AUTO_GENERATE_TIME || "00:10";

  timer = setInterval(async () => {
    const now = new Date();
    const targetYear = now.getFullYear() + 1;

    if (
      !hasReachedScheduleDate(now, scheduleMonth, scheduleDay) ||
      getTimeKey(now) < scheduleTime ||
      lastGeneratedYear === targetYear
    ) {
      return;
    }

    try {
      const existingLog = await prisma.planGenerationLog.findUnique({
        where: { generatedYear: targetYear },
      });

      if (existingLog) {
        lastGeneratedYear = targetYear;
        return;
      }

      const result = await pmPlanService.generate({ year: targetYear });

      await prisma.planGenerationLog.create({
        data: {
          generatedYear: targetYear,
          createdCount: result.newCreatedCount || 0,
          skippedCount: result.skippedCount || 0,
        },
      });

      lastGeneratedYear = targetYear;

      console.log(
        `[PM Plan Scheduler] generated ${targetYear}: created ${
          result.createdCount || 0
        }, skipped ${result.skippedCount || 0}`
      );
    } catch (error) {
      console.log("[PM Plan Scheduler] failed", error.message);
    }
  }, 60 * 1000);

  console.log(
    `[PM Plan Scheduler] enabled after ${String(scheduleMonth).padStart(2, "0")}-${String(
      scheduleDay
    ).padStart(2, "0")} at ${scheduleTime}`
  );
};

exports.stopPMPlanAutoGenerateScheduler = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
