const prisma = require("../config/prismaClient");

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
    where.OR = [
      {
        serialNumber: {
          contains: search,
        },
      },
      {
        deviceName: {
          contains: search,
        },
      },
    ];
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

  return await prisma.device.findMany({
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
  });
};

exports.getById = async (id) => {
  const device = await prisma.device.findUnique({
    where: {
      id: Number(id),
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
      pmPlans: true,
      pmRecords: true,
    },
  });

  if (!device) {
    const error = new Error("Device not found");
    error.status = 404;
    throw error;
  }

  return device;
};

exports.create = async (body) => {
  const {
    deviceTypeId,
    modelId,
    zoneId,
    serialNumber,
    deviceName,
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

  return await prisma.device.create({
    data: {
      deviceTypeId: Number(deviceTypeId),
      modelId: Number(modelId),
      zoneId: Number(zoneId),
      serialNumber,
      deviceName,
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
};

exports.update = async (id, body) => {
  const {
    deviceTypeId,
    modelId,
    zoneId,
    serialNumber,
    deviceName,
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

  if (status !== undefined) {
    data.status = status;
  }

  return await prisma.device.update({
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
    const inactiveDevice = await prisma.device.update({
      where: {
        id: deviceId,
      },
      data: {
        status: "INACTIVE",
      },
    });

    return {
      message: "Device has PM plan or PM record, changed to INACTIVE instead",
      device: inactiveDevice,
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