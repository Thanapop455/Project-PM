const prisma = require("../config/prisma");
const {
  DAY_MS,
  getTodayDate,
  getUTCDateRange,
  normalizeDateOnly,
} = require("../utils/date");
const { findManyPaginated, mapPaginated } = require("../utils/pagination");

const getPlanDateRange = (year, month) => {
  const range = getUTCDateRange({ year, month });

  return range
    ? {
        startDate: range.gte,
        endDate: range.lt,
      }
    : null;
};

const getDisplayStatus = (planDate, status) => {
  const todayDate = getTodayDate();
  const plan = normalizeDateOnly(planDate);

  if (status === "DONE") return "DONE";
  if (status === "CANCELLED") return "CANCELLED";

  if (status === "PENDING") {
    if (plan.getTime() === todayDate.getTime()) return "DUE TODAY";
    if (plan < todayDate) return "OVERDUE";
    return "PENDING";
  }

  return status;
};

const getDaysUntilPM = (planDate) => {
  const plan = normalizeDateOnly(planDate);

  if (!plan) {
    return null;
  }

  return Math.round((plan.getTime() - getTodayDate().getTime()) / DAY_MS);
};

const getCountdownLabel = (planDate, status = "PENDING") => {
  if (status === "DONE") return "เสร็จแล้ว";
  if (status === "CANCELLED") return "ยกเลิกแล้ว";

  const daysUntilPM = getDaysUntilPM(planDate);

  if (daysUntilPM === null) {
    return "ไม่ทราบวัน";
  }

  if (daysUntilPM === 0) {
    return "วันนี้";
  }

  if (daysUntilPM > 0) {
    return `อีก ${daysUntilPM} วัน`;
  }

  return `เลยกำหนด ${Math.abs(daysUntilPM)} วัน`;
};

const attachPlanTiming = (plan) => ({
  ...plan,
  displayStatus: getDisplayStatus(plan.planDate, plan.status),
  daysUntilPM: getDaysUntilPM(plan.planDate),
  countdownLabel: getCountdownLabel(plan.planDate, plan.status),
});

const addMonthsClamped = (baseDate, monthsToAdd) => {
  const firstDayOfTargetMonth = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth() + monthsToAdd,
      1
    )
  );

  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstDayOfTargetMonth.getUTCFullYear(),
      firstDayOfTargetMonth.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  return new Date(
    Date.UTC(
      firstDayOfTargetMonth.getUTCFullYear(),
      firstDayOfTargetMonth.getUTCMonth(),
      Math.min(baseDate.getUTCDate(), lastDayOfTargetMonth)
    )
  );
};

const getPlanDatesForYear = ({
  startDate,
  intervalMonths,
  targetYear,
  targetMonth,
}) => {
  const firstPlanDate = normalizeDateOnly(startDate);
  const interval = Number(intervalMonths);

  if (!firstPlanDate || !Number.isFinite(interval) || interval <= 0) {
    return [];
  }

  const monthsToTargetYear =
    (targetYear - firstPlanDate.getUTCFullYear()) * 12 -
    firstPlanDate.getUTCMonth();

  let monthOffset = 0;

  if (monthsToTargetYear > 0) {
    monthOffset = Math.ceil(monthsToTargetYear / interval) * interval;
  }

  const planDates = [];

  while (true) {
    const planDate = addMonthsClamped(firstPlanDate, monthOffset);

    if (planDate.getUTCFullYear() > targetYear) {
      break;
    }

    if (
      planDate.getUTCFullYear() === targetYear &&
      (!targetMonth || planDate.getUTCMonth() + 1 === targetMonth)
    ) {
      planDates.push(planDate);
    }

    monthOffset += interval;
  }

  return planDates;
};

const findPolicyForDevice = async (device, client = prisma) => {
  const typePolicy = await client.pMPolicy.findFirst({
    where: {
      target: "TYPE",
      deviceTypeId: device.deviceTypeId,
      isActive: true,
    },
  });

  if (typePolicy) {
    return typePolicy;
  }

  const groupPolicy = await client.pMPolicy.findFirst({
    where: {
      target: "GROUP",
      deviceGroupId: device.type.groupId,
      isActive: true,
    },
  });

  return groupPolicy;
};

const createPolicyResolver = async (client = prisma) => {
  const policies = await client.pMPolicy.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const typePolicies = new Map();
  const groupPolicies = new Map();

  for (const policy of policies) {
    if (policy.target === "TYPE" && policy.deviceTypeId && !typePolicies.has(policy.deviceTypeId)) {
      typePolicies.set(policy.deviceTypeId, policy);
    }

    if (
      policy.target === "GROUP" &&
      policy.deviceGroupId &&
      !groupPolicies.has(policy.deviceGroupId)
    ) {
      groupPolicies.set(policy.deviceGroupId, policy);
    }
  }

  return (device) =>
    typePolicies.get(device.deviceTypeId) ||
    groupPolicies.get(device.type?.groupId) ||
    null;
};

const toPolicyCost = (policy) =>
  policy ? Number(policy.defaultCost).toFixed(2) : null;

const createPlansForDevice = async ({
  device,
  targetYear,
  targetMonth = null,
  client = prisma,
}) => {
  const policy = await findPolicyForDevice(device, client);

  if (!policy) {
    return {
      policy: null,
      createdCount: 0,
      skippedCount: 1,
      plans: [],
      createdPlans: [],
    };
  }

  const planDates = getPlanDatesForYear({
    startDate: device.pmStartDate || device.createdAt,
    intervalMonths: policy.intervalMonths,
    targetYear,
    targetMonth,
  });

  let createdCount = 0;
  let skippedCount = 0;
  const plans = [];
  const createdPlans = [];

  for (const planDate of planDates) {
    const existingPlan = await client.pMPlan.findUnique({
      where: {
        deviceId_planDate: {
          deviceId: device.id,
          planDate,
        },
      },
    });

    if (existingPlan) {
      skippedCount++;
      continue;
    }

    const plan = await client.pMPlan.create({
      data: {
        deviceId: device.id,
        planDate,
        status: "PENDING",
      },
      include: {
        device: {
          include: {
            type: {
              include: {
                group: true,
              },
            },
            model: {
              include: {
                brand: true,
              },
            },
            zone: true,
          },
        },
      },
    });

    createdCount++;
    plans.push(plan);
    createdPlans.push(plan);
  }

  return {
    policy,
    createdCount,
    skippedCount,
    plans,
    createdPlans,
  };
};

exports.createPlansForDevice = createPlansForDevice;
exports.getCountdownLabel = getCountdownLabel;
exports.getDaysUntilPM = getDaysUntilPM;

const includePlanDevice = {
  device: {
    include: {
      type: {
        include: {
          group: true,
        },
      },
      model: {
        include: {
          brand: true,
        },
      },
      zone: true,
    },
  },
};

exports.replacePendingPlansForDevice = async ({
  device,
  targetYear,
  targetMonth = null,
  client = prisma,
}) => {
  const dateRange = getPlanDateRange(targetYear, targetMonth);

  if (!dateRange) {
    return {
      policy: null,
      deletedCount: 0,
      createdCount: 0,
      restoredCount: 0,
      skippedCount: 0,
      plans: [],
    };
  }

  const policy = await findPolicyForDevice(device, client);

  if (!policy) {
    const deleteResult = await client.pMPlan.deleteMany({
      where: {
        deviceId: device.id,
        status: "PENDING",
        planDate: {
          gte: dateRange.startDate,
          lt: dateRange.endDate,
        },
      },
    });

    return {
      policy: null,
      deletedCount: deleteResult.count,
      createdCount: 0,
      restoredCount: 0,
      skippedCount: 1,
      plans: [],
    };
  }

  const planDates = getPlanDatesForYear({
    startDate: device.pmStartDate || device.createdAt,
    intervalMonths: policy.intervalMonths,
    targetYear,
    targetMonth,
  });

  const plansToDelete = await client.pMPlan.findMany({
    where: {
      deviceId: device.id,
      status: "PENDING",
      planDate: {
        gte: dateRange.startDate,
        lt: dateRange.endDate,
        notIn: planDates,
      },
    },
    select: {
      id: true,
    },
  });

  const deleteIds = plansToDelete.map((plan) => plan.id);
  const deleteResult = deleteIds.length
    ? await client.pMPlan.deleteMany({
        where: { id: { in: deleteIds }, status: "PENDING" },
      })
    : { count: 0 };

  let createdCount = 0;
  let restoredCount = 0;
  let skippedCount = 0;
  const plans = [];

  for (const planDate of planDates) {
    const existingPlan = await client.pMPlan.findUnique({
      where: {
        deviceId_planDate: {
          deviceId: device.id,
          planDate,
        },
      },
      include: includePlanDevice,
    });

    if (existingPlan) {
      if (existingPlan.status === "CANCELLED") {
        const restoredPlan = await client.pMPlan.update({
          where: {
            id: existingPlan.id,
          },
          data: {
            status: "PENDING",
          },
          include: includePlanDevice,
        });

        restoredCount++;
        plans.push(restoredPlan);
      } else {
        skippedCount++;
      }

      continue;
    }

    const plan = await client.pMPlan.create({
      data: {
        deviceId: device.id,
        planDate,
        status: "PENDING",
      },
      include: includePlanDevice,
    });

    createdCount++;
    plans.push(plan);
  }

  return {
    policy,
    deletedCount: deleteResult.count,
    createdCount,
    restoredCount,
    skippedCount,
    plans,
  };
};

exports.generate = async ({ year, month }) => {
  if (!year) {
    const error = new Error("Year is required");
    error.status = 400;
    throw error;
  }

  const targetYear = Number(year);
  const targetMonth =
    month !== undefined && month !== null && month !== "" ? Number(month) : null;

  if (!Number.isInteger(targetYear)) {
    const error = new Error("Year must be a valid number");
    error.status = 400;
    throw error;
  }

  if (
    targetMonth !== null &&
    (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12)
  ) {
    const error = new Error("Month must be between 1 and 12");
    error.status = 400;
    throw error;
  }

  const devices = await prisma.device.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      type: {
        include: {
          group: true,
        },
      },
      model: {
        include: {
          brand: true,
        },
      },
      zone: true,
    },
  });

  let createdCount = 0;
  let skippedCount = 0;
  const createdPlans = [];
  const affectedPlans = [];

  for (const device of devices) {
    const result = await prisma.$transaction((tx) =>
      createPlansForDevice({
        device,
        targetYear,
        targetMonth,
        client: tx,
      })
    );

    createdCount += result.createdCount;
    skippedCount += result.skippedCount;
    createdPlans.push(...result.createdPlans);
    affectedPlans.push(...result.plans);
  }

  return {
    message: "Generate PM Plan success",
    createdCount,
    newCreatedCount: createdCount,
    skippedCount,
    plans: affectedPlans,
    createdPlanIds: createdPlans.map((plan) => plan.id),
  };
};

const normalizePlanIds = (planIds) =>
  Array.from(
    new Set(
      (Array.isArray(planIds) ? planIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

exports.undoGenerate = async ({ createdPlanIds }) => {
  const createdIds = normalizePlanIds(createdPlanIds);

  if (createdIds.length === 0) {
    const error = new Error("Generated PM plan IDs are required");
    error.status = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    const deleteResult = createdIds.length
      ? await tx.pMPlan.deleteMany({
          where: {
            id: { in: createdIds },
            status: "PENDING",
            pmRecord: null,
          },
        })
      : { count: 0 };

    return {
      deletedCount: deleteResult.count,
    };
  });

  return {
    message: "Generate PM Plan undone",
    deletedCount: result.deletedCount,
    skippedCount: createdIds.length - result.deletedCount,
  };
};

exports.list = async (query) => {
  const { year, month, groupId, typeId, zoneId, status, search } = query;

  const where = {};

  if (year) {
    const dateRange = getPlanDateRange(year, month);

    if (dateRange) {
      where.planDate = {
        gte: dateRange.startDate,
        lt: dateRange.endDate,
      };
    }
  }

  if (status) {
    where.status = status;
  }

  if (typeId || groupId || zoneId || search) {
    where.device = {};

    if (typeId) {
      where.device.deviceTypeId = Number(typeId);
    }

    if (zoneId) {
      where.device.zoneId = Number(zoneId);
    }

    if (groupId) {
      where.device.type = {
        groupId: Number(groupId),
      };
    }

    if (search) {
      where.device.OR = [
        {
          deviceName: {
            contains: String(search).trim(),
          },
        },
        {
          serialNumber: {
            contains: String(search).trim(),
          },
        },
      ];
    }
  }

  if (status === "PENDING") {
    where.device = {
      ...(where.device || {}),
      status: "ACTIVE",
    };
  }

  const plans = await findManyPaginated(prisma.pMPlan, {
    where,
    orderBy: {
      planDate: "asc",
    },
    include: {
      pmRecord: true,
      device: {
        include: {
          type: {
            include: {
              group: true,
            },
          },
          model: {
            include: {
              brand: true,
            },
          },
          zone: true,
        },
      },
    },
  }, query);

  const resolvePolicy = await createPolicyResolver();

  return mapPaginated(plans, (plan) => {
    const policy = resolvePolicy(plan.device);

    return {
      id: plan.id,
      deviceId: plan.deviceId,
      planDate: plan.planDate,
      status: plan.status,
      displayStatus: getDisplayStatus(plan.planDate, plan.status),
      daysUntilPM: getDaysUntilPM(plan.planDate),
      countdownLabel: getCountdownLabel(plan.planDate, plan.status),
      actualPMDate: plan.pmRecord ? plan.pmRecord.pmDate : null,
      policyCost: toPolicyCost(policy),
      device: plan.device,
      pmRecord: plan.pmRecord,
    };
  });
};

exports.getFilterOptions = async () => {
  const [groups, zones] = await Promise.all([
    prisma.deviceGroup.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.zone.findMany({
      orderBy: {
        code: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
  ]);

  return {
    groups,
    zones,
  };
};

exports.getAvailableYears = async () => {
  const [plans, records, devices] = await Promise.all([
    prisma.pMPlan.findMany({
      select: {
        planDate: true,
      },
    }),
    prisma.pMRecord.findMany({
      select: {
        pmDate: true,
      },
    }),
    prisma.device.findMany({
      where: {
        pmStartDate: {
          not: null,
        },
      },
      select: {
        pmStartDate: true,
      },
    }),
  ]);

  const years = new Set();

  for (const item of plans) {
    years.add(String(new Date(item.planDate).getUTCFullYear()));
  }

  for (const item of records) {
    years.add(String(new Date(item.pmDate).getUTCFullYear()));
  }

  for (const item of devices) {
    years.add(String(new Date(item.pmStartDate).getUTCFullYear()));
  }

  return Array.from(years)
    .filter((year) => /^\d{4}$/.test(year))
    .sort((a, b) => Number(b) - Number(a));
};

exports.getAlerts = async () => {
  const todayDate = getTodayDate();

  const next7Days = new Date(todayDate);
  next7Days.setUTCDate(next7Days.getUTCDate() + 7);

  const todayPlans = await prisma.pMPlan.findMany({
    where: {
      status: "PENDING",
      planDate: todayDate,
      device: {
        status: "ACTIVE",
      },
    },
    orderBy: {
      device: {
        deviceName: "asc",
      },
    },
    include: {
      device: {
        include: {
          type: {
            include: {
              group: true,
            },
          },
          model: {
            include: {
              brand: true,
            },
          },
          zone: true,
        },
      },
    },
  });

  const upcomingPlans = await prisma.pMPlan.findMany({
    where: {
      status: "PENDING",
      device: {
        status: "ACTIVE",
      },
      planDate: {
        gt: todayDate,
        lte: next7Days,
      },
    },
    orderBy: [
      {
        planDate: "asc",
      },
      {
        device: {
          deviceName: "asc",
        },
      },
    ],
    include: {
      device: {
        include: {
          type: {
            include: {
              group: true,
            },
          },
          model: {
            include: {
              brand: true,
            },
          },
          zone: true,
        },
      },
    },
  });

  const overduePlans = await prisma.pMPlan.findMany({
    where: {
      status: "PENDING",
      device: {
        status: "ACTIVE",
      },
      planDate: {
        lt: todayDate,
      },
    },
    orderBy: [
      {
        planDate: "desc",
      },
      {
        device: {
          deviceName: "asc",
        },
      },
    ],
    include: {
      device: {
        include: {
          type: {
            include: {
              group: true,
            },
          },
          model: {
            include: {
              brand: true,
            },
          },
          zone: true,
        },
      },
    },
  });

  return {
    today: todayPlans.map(attachPlanTiming),
    upcoming: upcomingPlans.map(attachPlanTiming),
    overdue: overduePlans.map(attachPlanTiming),
  };
};
