const ExcelJS = require("exceljs");
const prisma = require("../config/prismaClient");

const getDateRange = ({ year, month, startDate, endDate }) => {
  if (startDate && endDate) {
    return {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (year && month) {
    return {
      gte: new Date(Number(year), Number(month) - 1, 1),
      lt: new Date(Number(year), Number(month), 1),
    };
  }

  if (year) {
    return {
      gte: new Date(Number(year), 0, 1),
      lt: new Date(Number(year) + 1, 0, 1),
    };
  }

  return undefined;
};

const getDisplayStatus = (plan) => {
  if (plan.status === "DONE") return "DONE";
  if (plan.status === "CANCELLED") return "CANCELLED";

  const today = new Date();
  const planDate = new Date(plan.planDate);

  today.setHours(0, 0, 0, 0);
  planDate.setHours(0, 0, 0, 0);

  if (plan.status === "PENDING") {
    if (planDate.getTime() === today.getTime()) return "DUE TODAY";
    if (planDate < today) return "OVERDUE";
    return "PENDING";
  }

  return plan.status;
};

const formatDate = (date) => {
  if (!date) return null;

  const d = new Date(date);
  return d.toISOString().split("T")[0];
};

exports.getPMPlanReport = async (query) => {
  const { year, month, groupId, typeId, zoneId, status } = query;

  const where = {};

  const dateRange = getDateRange({ year, month });

  if (dateRange) {
    where.planDate = dateRange;
  }

  if (status) {
    where.status = status;
  }

  if (groupId || typeId || zoneId) {
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

  return plans.map((plan, index) => ({
    no: index + 1,
    pmPlanDate: formatDate(plan.planDate),
    actualPMDate: plan.pmRecord ? formatDate(plan.pmRecord.pmDate) : null,
    deviceGroup: plan.device.type.group.name,
    deviceType: plan.device.type.name,
    serialNumber: plan.device.serialNumber,
    brand: plan.device.model.brand.name,
    model: plan.device.model.name,
    deviceName: plan.device.deviceName,
    zoneCode: plan.device.zone.code,
    status: plan.status,
    displayStatus: getDisplayStatus(plan),
  }));
};

exports.getPMHistoryReport = async (query) => {
  const { deviceId, year, month, startDate, endDate } = query;

  const where = {};

  if (deviceId) {
    where.deviceId = Number(deviceId);
  }

  const dateRange = getDateRange({ year, month, startDate, endDate });

  if (dateRange) {
    where.pmDate = dateRange;
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

  return records.map((record, index) => ({
    no: index + 1,
    pmDate: formatDate(record.pmDate),
    performedBy: record.user.fullName,
    deviceGroup: record.device.type.group.name,
    deviceType: record.device.type.name,
    serialNumber: record.device.serialNumber,
    brand: record.device.model.brand.name,
    model: record.device.model.name,
    deviceName: record.device.deviceName,
    zoneCode: record.device.zone.code,
    cost: Number(record.cost),
    remark: record.remark,
  }));
};

exports.getPMCostReport = async (query) => {
  const { year, month } = query;

  const where = {};

  const dateRange = getDateRange({ year, month });

  if (dateRange) {
    where.pmDate = dateRange;
  }

  const records = await prisma.pMRecord.findMany({
    where,
    include: {
      device: {
        include: {
          type: {
            include: {
              group: true,
            },
          },
        },
      },
    },
  });

  const summary = {};

  for (const record of records) {
    const groupName = record.device.type.group.name;

    if (!summary[groupName]) {
      summary[groupName] = {
        equipmentGroup: groupName,
        totalPM: 0,
        totalCost: 0,
      };
    }

    summary[groupName].totalPM += 1;
    summary[groupName].totalCost += Number(record.cost);
  }

  return Object.values(summary).map((item, index) => ({
    no: index + 1,
    equipmentGroup: item.equipmentGroup,
    totalPM: item.totalPM,
    totalCost: item.totalCost,
  }));
};

const createWorkbook = (sheetName, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns;

  worksheet.getRow(1).font = {
    bold: true,
  };

  worksheet.addRows(rows);

  worksheet.columns.forEach((column) => {
    column.width = 20;
  });

  return workbook;
};

exports.createPMPlanExcel = async (query) => {
  const rows = await exports.getPMPlanReport(query);

  const workbook = createWorkbook(
    "PM Plan Report",
    [
      { header: "No", key: "no" },
      { header: "PM Plan Date", key: "pmPlanDate" },
      { header: "Actual PM Date", key: "actualPMDate" },
      { header: "Group", key: "deviceGroup" },
      { header: "Type", key: "deviceType" },
      { header: "Serial Number", key: "serialNumber" },
      { header: "Brand", key: "brand" },
      { header: "Model", key: "model" },
      { header: "Device Name", key: "deviceName" },
      { header: "Zone", key: "zoneCode" },
      { header: "Status", key: "displayStatus" },
    ],
    rows
  );

  return workbook;
};

exports.createPMHistoryExcel = async (query) => {
  const rows = await exports.getPMHistoryReport(query);

  const workbook = createWorkbook(
    "PM History Report",
    [
      { header: "No", key: "no" },
      { header: "PM Date", key: "pmDate" },
      { header: "Performed By", key: "performedBy" },
      { header: "Group", key: "deviceGroup" },
      { header: "Type", key: "deviceType" },
      { header: "Serial Number", key: "serialNumber" },
      { header: "Brand", key: "brand" },
      { header: "Model", key: "model" },
      { header: "Device Name", key: "deviceName" },
      { header: "Zone", key: "zoneCode" },
      { header: "Cost", key: "cost" },
      { header: "Remark", key: "remark" },
    ],
    rows
  );

  return workbook;
};

exports.createPMCostExcel = async (query) => {
  const rows = await exports.getPMCostReport(query);

  const workbook = createWorkbook(
    "PM Cost Report",
    [
      { header: "No", key: "no" },
      { header: "Group", key: "equipmentGroup" },
      { header: "Total PM", key: "totalPM" },
      { header: "Total Cost", key: "totalCost" },
    ],
    rows
  );

  return workbook;
};