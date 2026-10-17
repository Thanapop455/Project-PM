const prisma = require("../config/prisma");
const pmPlanService = require("./pmPlan");
const { findManyPaginated } = require("../utils/pagination");

const parseDateOnly = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  let date;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      date = new Date(Date.UTC(year, month - 1, day));

      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        date = null;
      }
    } else {
      const parsedDate = new Date(value);

      if (!Number.isNaN(parsedDate.getTime())) {
        date = new Date(
          Date.UTC(
            parsedDate.getUTCFullYear(),
            parsedDate.getUTCMonth(),
            parsedDate.getUTCDate()
          )
        );
      }
    }
  } else {
    const parsedDate = new Date(value);

    if (!Number.isNaN(parsedDate.getTime())) {
      date = new Date(
        Date.UTC(
          parsedDate.getUTCFullYear(),
          parsedDate.getUTCMonth(),
          parsedDate.getUTCDate()
        )
      );
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} is invalid`);
    error.status = 400;
    throw error;
  }

  return date;
};

const getDateOnlyTime = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const cancelPendingPlansForInactiveDevice = async (
  deviceId,
  client = prisma
) => {
  const plans = await client.pMPlan.findMany({
    where: {
      deviceId: Number(deviceId),
      status: "PENDING",
    },
    select: {
      id: true,
    },
  });

  const planIds = plans.map((plan) => plan.id);
  const result = planIds.length
    ? await client.pMPlan.updateMany({
        where: { id: { in: planIds }, status: "PENDING" },
        data: { status: "CANCELLED" },
      })
    : { count: 0 };

  return result.count;
};

exports.list = async (query) => {
  const {
    search,
    groupId,
    typeId,
    brandId,
    modelId,
    zoneId,
    status,
  } = query;

  const where = {};

  if (search) {
    const searchText = String(search).trim();
    const searchFilters = [
      { serialNumber: { contains: searchText } },
      { deviceName: { contains: searchText } },
      { remark: { contains: searchText } },
      { type: { name: { contains: searchText } } },
      { type: { group: { name: { contains: searchText } } } },
      { model: { name: { contains: searchText } } },
      { model: { brand: { name: { contains: searchText } } } },
      { zone: { code: { contains: searchText } } },
      { zone: { name: { contains: searchText } } },
    ];

    if (["ACTIVE", "INACTIVE"].includes(searchText.toUpperCase())) {
      searchFilters.push({ status: searchText.toUpperCase() });
    }

    where.OR = searchFilters;
  }

  if (typeId) {
    where.deviceTypeId = Number(typeId);
  }

  if (modelId) {
    where.modelId = Number(modelId);
  }

  if (zoneId) {
    where.zoneId = Number(zoneId);
  }

  if (status) {
    where.status = status;
  }

  if (groupId) {
    where.type = {
      groupId: Number(groupId),
    };
  }

  if (brandId) {
    where.model = {
      brandId: Number(brandId),
    };
  }

  return findManyPaginated(prisma.device, {
    where,
    orderBy: {
      id: "desc",
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
  }, query);
};

exports.create = async (body) => {
  const {
    deviceTypeId,
    modelId,
    zoneId,
    serialNumber,
    deviceName,
    remark,
    pmStartDate,
    status,
  } = body;

  if (!deviceTypeId) {
    const error = new Error("Device type is required");
    error.status = 400;
    throw error;
  }

  if (!modelId) {
    const error = new Error("Device model is required");
    error.status = 400;
    throw error;
  }

  if (!zoneId) {
    const error = new Error("Zone is required");
    error.status = 400;
    throw error;
  }

  if (!serialNumber) {
    const error = new Error("Serial number is required");
    error.status = 400;
    throw error;
  }

  if (!deviceName) {
    const error = new Error("Device name is required");
    error.status = 400;
    throw error;
  }

  const type = await prisma.deviceType.findUnique({
    where: {
      id: Number(deviceTypeId),
    },
  });

  if (!type) {
    const error = new Error("Device type not found");
    error.status = 404;
    throw error;
  }

  const model = await prisma.deviceModel.findUnique({
    where: {
      id: Number(modelId),
    },
  });

  if (!model) {
    const error = new Error("Device model not found");
    error.status = 404;
    throw error;
  }

  const zone = await prisma.zone.findUnique({
    where: {
      id: Number(zoneId),
    },
  });

  if (!zone) {
    const error = new Error("Zone not found");
    error.status = 404;
    throw error;
  }

  const device = await prisma.device.create({
    data: {
      deviceTypeId: Number(deviceTypeId),
      modelId: Number(modelId),
      zoneId: Number(zoneId),
      serialNumber,
      deviceName,
      remark: String(remark || "").trim() || null,
      pmStartDate: parseDateOnly(pmStartDate || new Date(), "PM start date"),
      status: status || "ACTIVE",
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

  let autoGeneratePMPlans = {
    createdCount: 0,
    skippedCount: 0,
    plans: [],
    message: "Device is inactive, PM plans were not generated",
  };

  if (device.status === "ACTIVE") {
    const currentYear = new Date().getFullYear();
    const pmStartYear = device.pmStartDate
      ? device.pmStartDate.getUTCFullYear()
      : currentYear;
    const targetYear = Math.max(currentYear, pmStartYear);
    const result = await pmPlanService.createPlansForDevice({
      device,
      targetYear,
    });

    autoGeneratePMPlans = {
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
      plans: result.plans,
      message: result.policy
        ? `Generated PM plans for ${targetYear}`
        : "PM policy not found, PM plans were not generated",
    };
  }

  return {
    ...device,
    autoGeneratePMPlans,
  };
};

exports.update = async (id, body) => {
  const {
    deviceTypeId,
    modelId,
    zoneId,
    serialNumber,
    deviceName,
    remark,
    pmStartDate,
    regeneratePMPlans,
    status,
  } = body;

  const oldDevice = await prisma.device.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!oldDevice) {
    const error = new Error("Device not found");
    error.status = 404;
    throw error;
  }

  const data = {};
  let nextPMStartDate;

  if (deviceTypeId !== undefined) {
    const type = await prisma.deviceType.findUnique({
      where: {
        id: Number(deviceTypeId),
      },
    });
    
    if (!type) {
      const error = new Error("Device type not found");
      error.status = 404;
      throw error;
    }

    data.deviceTypeId = Number(deviceTypeId);
  }

  if (modelId !== undefined) {
    const model = await prisma.deviceModel.findUnique({
      where: {
        id: Number(modelId),
      },
    });

    if (!model) {
      const error = new Error("Device model not found");
      error.status = 404;
      throw error;
    }

    data.modelId = Number(modelId);
  }

  if (zoneId !== undefined) {
    const zone = await prisma.zone.findUnique({
      where: {
        id: Number(zoneId),
      },
    });

    if (!zone) {
      const error = new Error("Zone not found");
      error.status = 404;
      throw error;
    }

    data.zoneId = Number(zoneId);
  }

  if (serialNumber !== undefined) {
    data.serialNumber = serialNumber;
  }

  if (deviceName !== undefined) {
    data.deviceName = deviceName;
  }

  if (remark !== undefined) {
    data.remark = String(remark || "").trim() || null;
  }

  if (pmStartDate !== undefined) {
    nextPMStartDate = parseDateOnly(pmStartDate, "PM start date");
    data.pmStartDate = nextPMStartDate;
  }

  if (status !== undefined) {
    data.status = status;
  }

  const pmStartDateChanged =
    pmStartDate !== undefined &&
    getDateOnlyTime(oldDevice.pmStartDate) !== getDateOnlyTime(nextPMStartDate);
  const shouldCancelPendingPlans =
    status !== undefined && String(status).toUpperCase() === "INACTIVE";
  const shouldRestorePlansForReactivatedDevice =
    oldDevice.status === "INACTIVE" &&
    status !== undefined &&
    String(status).toUpperCase() === "ACTIVE";

  return await prisma.$transaction(async (tx) => {
    const device = await tx.device.update({
      where: {
        id: Number(id),
      },
      data,
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

    if (shouldCancelPendingPlans) {
      const cancelledPendingPlanCount = await cancelPendingPlansForInactiveDevice(
        device.id,
        tx
      );

      return {
        ...device,
        inactivePlanCleanup: {
          cancelledPendingPlanCount,
          message: "Pending PM plans were cancelled because device is inactive",
        },
      };
    }

    if (shouldRestorePlansForReactivatedDevice) {
      const currentYear = new Date().getFullYear();
      const pmStartYear = device.pmStartDate
        ? device.pmStartDate.getUTCFullYear()
        : currentYear;
      const targetYear = Math.max(currentYear, pmStartYear);
      const cancelledPlans = await tx.pMPlan.findMany({
        where: {
          deviceId: device.id,
          status: "CANCELLED",
          planDate: {
            gte: new Date(Date.UTC(targetYear, 0, 1)),
          },
        },
        select: {
          planDate: true,
        },
      });
      const affectedYears = Array.from(
        new Set([
          targetYear,
          ...cancelledPlans.map((plan) => plan.planDate.getUTCFullYear()),
        ])
      ).sort((a, b) => a - b);
      const summary = {
        deletedCount: 0,
        createdCount: 0,
        restoredCount: 0,
        skippedCount: 0,
        affectedYears,
        message: "Device reactivated, PM plans restored",
      };

      for (const affectedYear of affectedYears) {
        const result = await pmPlanService.replacePendingPlansForDevice({
          device,
          targetYear: affectedYear,
          client: tx,
        });

        summary.deletedCount += result.deletedCount;
        summary.createdCount += result.createdCount;
        summary.restoredCount += result.restoredCount;
        summary.skippedCount += result.skippedCount;
      }

      return {
        ...device,
        reschedulePMPlans: summary,
      };
    }

    if (!regeneratePMPlans || !pmStartDateChanged) {
      return device;
    }

    if (device.status !== "ACTIVE") {
      return {
        ...device,
        reschedulePMPlans: {
          deletedCount: 0,
          createdCount: 0,
          restoredCount: 0,
          skippedCount: 0,
          affectedYears: [],
          message: "Device is inactive, PM plans were not regenerated",
        },
      };
    }

    const pendingPlans = await tx.pMPlan.findMany({
      where: {
        deviceId: device.id,
        status: "PENDING",
      },
      select: {
        planDate: true,
      },
    });

    const currentYear = new Date().getFullYear();
    const pmStartYear = device.pmStartDate
      ? device.pmStartDate.getUTCFullYear()
      : currentYear;
    const targetYear = Math.max(currentYear, pmStartYear);
    const affectedYears = Array.from(
      new Set([
        targetYear,
        ...pendingPlans.map((plan) => plan.planDate.getUTCFullYear()),
      ])
    ).sort((a, b) => a - b);

    const summary = {
      deletedCount: 0,
      createdCount: 0,
      restoredCount: 0,
      skippedCount: 0,
      affectedYears,
      message: "PM plans regenerated",
    };

    for (const affectedYear of affectedYears) {
      const result = await pmPlanService.replacePendingPlansForDevice({
        device,
        targetYear: affectedYear,
        client: tx,
      });

      summary.deletedCount += result.deletedCount;
      summary.createdCount += result.createdCount;
      summary.restoredCount += result.restoredCount;
      summary.skippedCount += result.skippedCount;
    }

    return {
      ...device,
      reschedulePMPlans: summary,
    };
  });
};

exports.remove = async (id) => {
  const deviceId = Number(id);

  const device = await prisma.device.findUnique({
    where: {
      id: deviceId,
    },
  });

  if (!device) {
    const error = new Error("Device not found");
    error.status = 404;
    throw error;
  }

  const pmPlanCount = await prisma.pMPlan.count({
    where: {
      deviceId,
    },
  });

  const pmRecordCount = await prisma.pMRecord.count({
    where: {
      deviceId,
    },
  });

  if (pmPlanCount > 0 || pmRecordCount > 0) {
    const result = await prisma.$transaction(async (tx) => {
      const inactiveDevice = await tx.device.update({
        where: {
          id: deviceId,
        },
        data: {
          status: "INACTIVE",
        },
      });

      const cancelledPendingPlanCount = await cancelPendingPlansForInactiveDevice(
        deviceId,
        tx
      );

      return {
        inactiveDevice,
        cancelledPendingPlanCount,
      };
    });

    return {
      message:
        "Device has PM plan or PM record, changed to INACTIVE instead and pending PM plans were cancelled",
      device: result.inactiveDevice,
      cancelledPendingPlanCount: result.cancelledPendingPlanCount,
    };
  }

  await prisma.device.delete({
    where: {
      id: deviceId,
    },
  });

  return {
    message: "Delete success",
  };
};
