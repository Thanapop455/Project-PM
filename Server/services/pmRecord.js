const prisma = require("../config/prismaClient");

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

exports.list = async (query) => {
  const { deviceId, year, month } = query;

  const where = {};

  if (deviceId) {
    where.deviceId = Number(deviceId);
  }

  if (year && month) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    where.pmDate = {
      gte: startDate,
      lt: endDate,
    };
  }

  const records = await prisma.pMRecord.findMany({
    where,
    orderBy: {
      pmDate: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
        },
      },
      pmPlan: true,
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

  return records;
};

exports.getByDevice = async (deviceId) => {
  const device = await prisma.device.findUnique({
    where: {
      id: Number(deviceId),
    },
  });

  if (!device) {
    const error = new Error("Device not found");
    error.status = 404;
    throw error;
  }

  return await prisma.pMRecord.findMany({
    where: {
      deviceId: Number(deviceId),
    },
    orderBy: {
      pmDate: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
        },
      },
      pmPlan: true,
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
};

exports.create = async (body, userId) => {
  const { pmPlanId, pmDate, cost, remark } = body;

  if (!pmPlanId) {
    const error = new Error("PM Plan is required");
    error.status = 400;
    throw error;
  }

  if (!pmDate) {
    const error = new Error("PM date is required");
    error.status = 400;
    throw error;
  }

  const plan = await prisma.pMPlan.findUnique({
    where: {
      id: Number(pmPlanId),
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

  if (!plan) {
    const error = new Error("PM Plan not found");
    error.status = 404;
    throw error;
  }

  if (plan.status === "DONE") {
    const error = new Error("This PM Plan is already done");
    error.status = 400;
    throw error;
  }

  if (plan.status === "CANCELLED") {
    const error = new Error("Cannot record cancelled PM Plan");
    error.status = 400;
    throw error;
  }

  if (plan.pmRecord) {
    const error = new Error("This PM Plan already has PM Record");
    error.status = 400;
    throw error;
  }

  let finalCost = cost;

  if (finalCost === undefined || finalCost === null || finalCost === "") {
    const policy = await findPolicyForDevice(plan.device);

    if (!policy) {
      const error = new Error("PM Policy not found for this device");
      error.status = 404;
      throw error;
    }

    finalCost = policy.defaultCost;
  }

  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.pMRecord.create({
      data: {
        pmPlanId: Number(pmPlanId),
        deviceId: plan.deviceId,
        performedBy: userId,
        pmDate: new Date(pmDate),
        cost: String(finalCost),
        remark: remark || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
        pmPlan: true,
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

    const updatedPlan = await tx.pMPlan.update({
      where: {
        id: Number(pmPlanId),
      },
      data: {
        status: "DONE",
      },
    });

    return {
      message: "Complete PM success",
      record,
      plan: updatedPlan,
    };
  });

  return result;
};