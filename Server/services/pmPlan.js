const prisma = require("../config/prismaClient");

const getStartAndEndDate = (year, month) => {
  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 1);

  return { startDate, endDate };
};

const getDisplayStatus = (planDate, status) => {
  const today = new Date();
  const plan = new Date(planDate);

  today.setHours(0, 0, 0, 0);
  plan.setHours(0, 0, 0, 0);

  if (status === "DONE") return "DONE";
  if (status === "CANCELLED") return "CANCELLED";

  if (status === "PENDING") {
    if (plan.getTime() === today.getTime()) return "DUE TODAY";
    if (plan < today) return "OVERDUE";
    return "PENDING";
  }

  return status;
};

const findPolicyForDevice = async (device) => {
  const typePolicy = await prisma.pMPolicy.findFirst({
    where: {
      target: "TYPE",
      deviceTypeId: device.deviceTypeId,
      isActive: true,
    },
  });

  if (typePolicy) {
    return typePolicy;
  }

  const groupPolicy = await prisma.pMPolicy.findFirst({
    where: {
      target: "GROUP",
      deviceGroupId: device.type.groupId,
      isActive: true,
    },
  });

  return groupPolicy;
};

exports.generate = async ({ year, month }) => {
  if (!year) {
    const error = new Error("Year is required");
    error.status = 400;
    throw error;
  }

  const targetYear = Number(year);
  const targetMonth = month ? Number(month) : null;

  if (targetMonth && (targetMonth < 1 || targetMonth > 12)) {
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

  for (const device of devices) {
    const policy = await findPolicyForDevice(device);

    if (!policy) {
      skippedCount++;
      continue;
    }

    const interval = policy.intervalMonths;

    for (let monthIndex = 0; monthIndex < 12; monthIndex += interval) {
      const planMonth = monthIndex + 1;

      if (targetMonth && planMonth !== targetMonth) {
        continue;
      }

      const planDate = new Date(targetYear, monthIndex, 1);

      const existingPlan = await prisma.pMPlan.findUnique({
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

      const plan = await prisma.pMPlan.create({
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
      createdPlans.push(plan);
    }
  }

  return {
    message: "Generate PM Plan success",
    createdCount,
    skippedCount,
    plans: createdPlans,
  };
};

exports.list = async (query) => {
  const { year, month, groupId, typeId, zoneId, status } = query;

  const where = {};

  if (year && month) {
    const { startDate, endDate } = getStartAndEndDate(year, month);

    where.planDate = {
      gte: startDate,
      lt: endDate,
    };
  }

  if (status) {
    where.status = status;
  }

  if (typeId || groupId || zoneId) {
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
  }

  const plans = await prisma.pMPlan.findMany({
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
  });

  return plans.map((plan) => ({
    id: plan.id,
    deviceId: plan.deviceId,
    planDate: plan.planDate,
    status: plan.status,
    displayStatus: getDisplayStatus(plan.planDate, plan.status),
    actualPMDate: plan.pmRecord ? plan.pmRecord.pmDate : null,
    device: plan.device,
    pmRecord: plan.pmRecord,
  }));
};

exports.getAlerts = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);

  const todayPlans = await prisma.pMPlan.findMany({
    where: {
      status: "PENDING",
      planDate: today,
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
      planDate: {
        gt: today,
        lte: next7Days,
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

  const overduePlans = await prisma.pMPlan.findMany({
    where: {
      status: "PENDING",
      planDate: {
        lt: today,
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

  return {
    today: todayPlans,
    upcoming: upcomingPlans,
    overdue: overduePlans,
  };
};

exports.cancel = async (id) => {
  const plan = await prisma.pMPlan.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!plan) {
    const error = new Error("PM Plan not found");
    error.status = 404;
    throw error;
  }

  if (plan.status === "DONE") {
    const error = new Error("Cannot cancel completed PM Plan");
    error.status = 400;
    throw error;
  }

  return await prisma.pMPlan.update({
    where: {
      id: Number(id),
    },
    data: {
      status: "CANCELLED",
    },
  });
};