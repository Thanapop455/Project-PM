const prisma = require("../config/prisma");
const pmPlanService = require("./pmPlan");
const { getUTCDateRange, parseDateInput } = require("../utils/date");
const { findManyPaginated } = require("../utils/pagination");

exports.list = async (query) => {
  const { deviceId, year, month, search } = query;

  const where = {};

  if (deviceId) {
    where.deviceId = Number(deviceId);
  }

  if (year) {
    const dateRange = getUTCDateRange({ year, month });

    if (dateRange) {
      where.pmDate = dateRange;
    }
  }

  if (search) {
    const searchText = String(search).trim();
    const searchFilters = [
      { remark: { contains: searchText } },
      { user: { username: { contains: searchText } } },
      { user: { fullName: { contains: searchText } } },
      { device: { deviceName: { contains: searchText } } },
      { device: { serialNumber: { contains: searchText } } },
      { device: { type: { name: { contains: searchText } } } },
      { device: { type: { group: { name: { contains: searchText } } } } },
      { device: { model: { name: { contains: searchText } } } },
      { device: { model: { brand: { name: { contains: searchText } } } } },
      { device: { zone: { code: { contains: searchText } } } },
    ];

    if (searchText !== "" && Number.isFinite(Number(searchText))) {
      searchFilters.push({ cost: Number(searchText) });
    }

    where.OR = searchFilters;
  }

  const records = await findManyPaginated(prisma.pMRecord, {
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
  }, query);

  return records;
};

exports.create = async (body, actor) => {
  const { pmPlanId, pmDate, cost, remark } = body;
  const userId = Number(actor?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error("Authenticated user is required");
    error.status = 401;
    throw error;
  }

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

  const parsedPMDate = parseDateInput(pmDate);

  if (!parsedPMDate) {
    const error = new Error("PM date is invalid");
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
    const policy = await pmPlanService.findPolicyForDevice(plan.device);

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
        pmDate: parsedPMDate,
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

    const planSync = await pmPlanService.completePlanAndScheduleNextFromRecord({
      pmPlanId: Number(pmPlanId),
      record,
      client: tx,
    });

    return {
      message: "Complete PM success",
      record,
      plan: planSync.completedPlan,
      nextPlan: planSync.nextPlan,
      pmPlanSync: planSync,
    };
  });

  return result;
};
