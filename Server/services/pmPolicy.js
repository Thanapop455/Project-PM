const prisma = require("../config/prisma");
const pmPlanService = require("./pmPlan");
const { findManyPaginated } = require("../utils/pagination");

const createPlanSyncSummary = () => ({
  deviceCount: 0,
  deletedCount: 0,
  createdCount: 0,
  restoredCount: 0,
  skippedCount: 0,
  affectedYears: [],
});

const syncPendingPlansForGroup = async (deviceGroupId, client) => {
  const summary = createPlanSyncSummary();

  if (!deviceGroupId) {
    return summary;
  }

  const devices = await client.device.findMany({
    where: {
      status: "ACTIVE",
      type: {
        groupId: Number(deviceGroupId),
      },
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
      pmPlans: {
        where: {
          status: "PENDING",
        },
        select: {
          planDate: true,
        },
      },
    },
  });

  const currentYear = new Date().getFullYear();
  const affectedYears = new Set();
  summary.deviceCount = devices.length;

  for (const device of devices) {
    const pmStartYear = device.pmStartDate
      ? device.pmStartDate.getUTCFullYear()
      : currentYear;
    const targetYear = Math.max(currentYear, pmStartYear);
    const deviceYears = Array.from(
      new Set([
        targetYear,
        ...device.pmPlans.map((plan) => plan.planDate.getUTCFullYear()),
      ])
    ).sort((a, b) => a - b);

    for (const year of deviceYears) {
      const result = await pmPlanService.replacePendingPlansForDevice({
        device,
        targetYear: year,
        client,
      });

      affectedYears.add(year);
      summary.deletedCount += result.deletedCount;
      summary.createdCount += result.createdCount;
      summary.restoredCount += result.restoredCount;
      summary.skippedCount += result.skippedCount;
    }
  }

  summary.affectedYears = Array.from(affectedYears).sort((a, b) => a - b);
  return summary;
};

const mergePlanSyncSummaries = (summaries) => {
  const result = createPlanSyncSummary();
  const affectedYears = new Set();

  for (const summary of summaries) {
    result.deviceCount += summary.deviceCount;
    result.deletedCount += summary.deletedCount;
    result.createdCount += summary.createdCount;
    result.restoredCount += summary.restoredCount;
    result.skippedCount += summary.skippedCount;
    summary.affectedYears.forEach((year) => affectedYears.add(year));
  }

  result.affectedYears = Array.from(affectedYears).sort((a, b) => a - b);
  return result;
};

const checkPMPolicyData = async (body, updateId = null) => {
  const {
    deviceGroupId,
    intervalMonths,
    defaultCost,
    isActive,
  } = body;

  if (body.target && body.target !== "GROUP") {
    const error = new Error("Only device group PM Policies are supported");
    error.status = 400;
    throw error;
  }

  if (!intervalMonths) {
    const error = new Error("Interval months is required");
    error.status = 400;
    throw error;
  }

  if (Number(intervalMonths) <= 0) {
    const error = new Error("Interval months must be greater than 0");
    error.status = 400;
    throw error;
  }

  if (defaultCost === undefined || defaultCost === null || defaultCost === "") {
    const error = new Error("Default cost is required");
    error.status = 400;
    throw error;
  }

  if (Number(defaultCost) < 0) {
    const error = new Error("Default cost must be greater than or equal to 0");
    error.status = 400;
    throw error;
  }

  const data = {
    target: "GROUP",
    intervalMonths: Number(intervalMonths),
    defaultCost: String(defaultCost),
    isActive: isActive === undefined ? true : Boolean(isActive),
  };

  if (!deviceGroupId) {
    const error = new Error("Device group is required");
    error.status = 400;
    throw error;
  }

  const group = await prisma.deviceGroup.findUnique({
    where: { id: Number(deviceGroupId) },
  });

  if (!group) {
    const error = new Error("Device group not found");
    error.status = 404;
    throw error;
  }

  const duplicate = await prisma.pMPolicy.findFirst({
    where: {
      target: "GROUP",
      deviceGroupId: Number(deviceGroupId),
      id: updateId ? { not: Number(updateId) } : undefined,
    },
  });

  if (duplicate) {
    const error = new Error("PM Policy for this device group already exists");
    error.status = 400;
    throw error;
  }

  data.deviceGroupId = Number(deviceGroupId);
  data.deviceTypeId = null;

  return data;
};

exports.list = async (query = {}) => {
  const search = String(query.search || "").trim();
  const searchFilters = search
    ? [
        { deviceGroup: { name: { contains: search } } },
      ]
    : [];

  if (search !== "" && Number.isFinite(Number(search))) {
    searchFilters.push(
      { intervalMonths: Number(search) },
      { defaultCost: Number(search) }
    );
  }

  const normalizedSearch = search.toUpperCase();

  if (["ACTIVE", "TRUE"].includes(normalizedSearch)) {
    searchFilters.push({ isActive: true });
  } else if (["INACTIVE", "FALSE"].includes(normalizedSearch)) {
    searchFilters.push({ isActive: false });
  }

  return findManyPaginated(prisma.pMPolicy, {
    where: {
      target: "GROUP",
      ...(searchFilters.length ? { OR: searchFilters } : {}),
    },
    orderBy: { id: "desc" },
    include: {
      deviceGroup: true,
    },
  }, query);
};

exports.create = async (body) => {
  const data = await checkPMPolicyData(body);

  return prisma.$transaction(
    async (tx) => {
      const policy = await tx.pMPolicy.create({
        data,
        include: {
          deviceGroup: true,
        },
      });
      const planSync = await syncPendingPlansForGroup(policy.deviceGroupId, tx);

      return {
        ...policy,
        planSync,
      };
    },
    { timeout: 30000 }
  );
};

exports.update = async (id, body) => {
  const oldPolicy = await prisma.pMPolicy.findUnique({
    where: { id: Number(id) },
  });

  if (!oldPolicy) {
    const error = new Error("PM Policy not found");
    error.status = 404;
    throw error;
  }

  const newBody = {
    target: "GROUP",
    deviceGroupId:
      body.deviceGroupId !== undefined
        ? body.deviceGroupId
        : oldPolicy.deviceGroupId,
    intervalMonths: body.intervalMonths ?? oldPolicy.intervalMonths,
    defaultCost:
      body.defaultCost !== undefined
        ? body.defaultCost
        : oldPolicy.defaultCost.toString(),
    isActive: body.isActive ?? oldPolicy.isActive,
  };

  const data = await checkPMPolicyData(newBody, id);

  const scheduleChanged =
    Number(oldPolicy.deviceGroupId) !== Number(data.deviceGroupId) ||
    Number(oldPolicy.intervalMonths) !== Number(data.intervalMonths) ||
    oldPolicy.isActive !== data.isActive;

  return prisma.$transaction(
    async (tx) => {
      const policy = await tx.pMPolicy.update({
        where: { id: Number(id) },
        data,
        include: {
          deviceGroup: true,
        },
      });

      let planSync = createPlanSyncSummary();

      if (scheduleChanged) {
        const groupIds = Array.from(
          new Set([oldPolicy.deviceGroupId, policy.deviceGroupId].filter(Boolean))
        );
        const summaries = [];

        for (const groupId of groupIds) {
          summaries.push(await syncPendingPlansForGroup(groupId, tx));
        }

        planSync = mergePlanSyncSummaries(summaries);
      }

      return {
        ...policy,
        planSync,
        scheduleChanged,
      };
    },
    { timeout: 30000 }
  );
};

exports.remove = async (id) => {
  const policy = await prisma.pMPolicy.findUnique({
    where: { id: Number(id) },
  });

  if (!policy) {
    const error = new Error("PM Policy not found");
    error.status = 404;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.pMPolicy.delete({
        where: { id: Number(id) },
      });
      const planSync = await syncPendingPlansForGroup(policy.deviceGroupId, tx);

      return {
        message: "Delete success",
        planSync,
      };
    },
    { timeout: 30000 }
  );
};
