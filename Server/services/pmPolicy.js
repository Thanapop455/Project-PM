const prisma = require("../config/prisma");
const { findManyPaginated } = require("../utils/pagination");

const checkPMPolicyData = async (body, updateId = null) => {
  const {
    target,
    deviceGroupId,
    deviceTypeId,
    intervalMonths,
    defaultCost,
    isActive,
  } = body;

  if (!target) {
    const error = new Error("Target is required");
    error.status = 400;
    throw error;
  }

  if (!["GROUP", "TYPE"].includes(target)) {
    const error = new Error("Target must be GROUP or TYPE");
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
    target,
    intervalMonths: Number(intervalMonths),
    defaultCost: String(defaultCost),
    isActive: isActive === undefined ? true : Boolean(isActive),
  };

  if (target === "GROUP") {
    if (!deviceGroupId) {
      const error = new Error("Device group is required");
      error.status = 400;
      throw error;
    }

    if (deviceTypeId) {
      const error = new Error("Device type must be empty when target is GROUP");
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
  }

  if (target === "TYPE") {
    if (!deviceTypeId) {
      const error = new Error("Device type is required");
      error.status = 400;
      throw error;
    }

    if (deviceGroupId) {
      const error = new Error("Device group must be empty when target is TYPE");
      error.status = 400;
      throw error;
    }

    const type = await prisma.deviceType.findUnique({
      where: { id: Number(deviceTypeId) },
    });

    if (!type) {
      const error = new Error("Device type not found");
      error.status = 404;
      throw error;
    }

    const duplicate = await prisma.pMPolicy.findFirst({
      where: {
        deviceTypeId: Number(deviceTypeId),
        id: updateId ? { not: Number(updateId) } : undefined,
      },
    });

    if (duplicate) {
      const error = new Error("PM Policy for this device type already exists");
      error.status = 400;
      throw error;
    }

    data.deviceTypeId = Number(deviceTypeId);
    data.deviceGroupId = null;
  }

  return data;
};

exports.list = async (query = {}) => {
  const search = String(query.search || "").trim();
  const target = search.toUpperCase();
  const searchFilters = search
    ? [
        { deviceGroup: { name: { contains: search } } },
        { deviceType: { name: { contains: search } } },
        { deviceType: { group: { name: { contains: search } } } },
      ]
    : [];

  if (["GROUP", "TYPE"].includes(target)) {
    searchFilters.push({ target });
  }

  if (search !== "" && Number.isFinite(Number(search))) {
    searchFilters.push(
      { intervalMonths: Number(search) },
      { defaultCost: Number(search) }
    );
  }

  if (["ACTIVE", "TRUE"].includes(target)) {
    searchFilters.push({ isActive: true });
  } else if (["INACTIVE", "FALSE"].includes(target)) {
    searchFilters.push({ isActive: false });
  }

  return findManyPaginated(prisma.pMPolicy, {
    where: searchFilters.length ? { OR: searchFilters } : undefined,
    orderBy: { id: "desc" },
    include: {
      deviceGroup: true,
      deviceType: {
        include: {
          group: true,
        },
      },
    },
  }, query);
};

exports.create = async (body) => {
  const data = await checkPMPolicyData(body);

  return await prisma.pMPolicy.create({
    data,
    include: {
      deviceGroup: true,
      deviceType: {
        include: {
          group: true,
        },
      },
    },
  });
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
    target: body.target ?? oldPolicy.target,
    deviceGroupId:
      body.deviceGroupId !== undefined
        ? body.deviceGroupId
        : oldPolicy.deviceGroupId,
    deviceTypeId:
      body.deviceTypeId !== undefined
        ? body.deviceTypeId
        : oldPolicy.deviceTypeId,
    intervalMonths: body.intervalMonths ?? oldPolicy.intervalMonths,
    defaultCost:
      body.defaultCost !== undefined
        ? body.defaultCost
        : oldPolicy.defaultCost.toString(),
    isActive: body.isActive ?? oldPolicy.isActive,
  };

  const data = await checkPMPolicyData(newBody, id);

  return await prisma.pMPolicy.update({
    where: { id: Number(id) },
    data,
    include: {
      deviceGroup: true,
      deviceType: {
        include: {
          group: true,
        },
      },
    },
  });
};

exports.remove = async (id) => {
  await prisma.pMPolicy.delete({
    where: { id: Number(id) },
  });

  return { message: "Delete success" };
};
