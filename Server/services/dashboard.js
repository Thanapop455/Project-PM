const prisma = require("../config/prisma");
const pmPlanService = require("./pmPlan");
const { getUTCDateRange } = require("../utils/date");

const getDateRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthRange = getUTCDateRange({ year, month });
  const yearRange = getUTCDateRange({ year });

  return {
    monthStart: monthRange.gte,
    nextMonthStart: monthRange.lt,
    yearStart: yearRange.gte,
    nextYearStart: yearRange.lt,
  };
};

const toMoney = (value) => Number(value || 0);

const getCostTotal = async (where) => {
  const result = await prisma.pMRecord.aggregate({
    where,
    _sum: {
      cost: true,
    },
  });

  return toMoney(result._sum.cost);
};

const getDeviceGroupSummary = async () => {
  const devices = await prisma.device.findMany({
    include: {
      type: {
        include: {
          group: true,
        },
      },
    },
  });

  const summary = new Map();

  for (const device of devices) {
    const groupName = device.type?.group?.name || "-";
    const current = summary.get(groupName) || {
      group: groupName,
      total: 0,
      active: 0,
      inactive: 0,
    };

    current.total += 1;

    if (device.status === "ACTIVE") {
      current.active += 1;
    } else {
      current.inactive += 1;
    }

    summary.set(groupName, current);
  }

  return Array.from(summary.values()).sort((a, b) =>
    a.group.localeCompare(b.group)
  );
};

const pickNextTasks = (alerts) =>
  [...alerts.overdue, ...alerts.today, ...alerts.upcoming]
    .sort((a, b) => {
      const dayA = a.daysUntilPM ?? 99999;
      const dayB = b.daysUntilPM ?? 99999;

      if (dayA !== dayB) {
        return dayA - dayB;
      }

      return new Date(a.planDate) - new Date(b.planDate);
    })
    .slice(0, 10);

exports.getSummary = async ({ role }) => {
  const { monthStart, nextMonthStart, yearStart, nextYearStart } =
    getDateRange();

  const alerts = await pmPlanService.getAlerts();

  const [
    userCount,
    deviceCount,
    activeDeviceCount,
    inactiveDeviceCount,
    totalPlans,
    pendingPlans,
    donePlans,
    cancelledPlans,
    records,
    doneThisMonth,
    monthlyCost,
    yearlyCost,
    deviceGroups,
  ] = await Promise.all([
    role === "ADMIN" ? prisma.user.count() : Promise.resolve(null),
    prisma.device.count(),
    prisma.device.count({ where: { status: "ACTIVE" } }),
    prisma.device.count({ where: { status: "INACTIVE" } }),
    prisma.pMPlan.count(),
    prisma.pMPlan.count({ where: { status: "PENDING" } }),
    prisma.pMPlan.count({ where: { status: "DONE" } }),
    prisma.pMPlan.count({ where: { status: "CANCELLED" } }),
    prisma.pMRecord.count(),
    prisma.pMRecord.count({
      where: {
        pmDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
    getCostTotal({
      pmDate: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    }),
    getCostTotal({
      pmDate: {
        gte: yearStart,
        lt: nextYearStart,
      },
    }),
    getDeviceGroupSummary(),
  ]);

  return {
    counts: {
      users: userCount,
      devices: deviceCount,
      activeDevices: activeDeviceCount,
      inactiveDevices: inactiveDeviceCount,
      pmPlans: totalPlans,
      pmRecords: records,
      pendingPlans,
      donePlans,
      cancelledPlans,
      doneThisMonth,
    },
    alerts: {
      dueToday: alerts.today.length,
      upcoming: alerts.upcoming.length,
      overdue: alerts.overdue.length,
    },
    costs: {
      month: monthlyCost,
      year: yearlyCost,
    },
    deviceGroups,
    nextTasks: pickNextTasks(alerts),
  };
};
