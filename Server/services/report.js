const ExcelJS = require("exceljs");
const prisma = require("../config/prisma");
const {
  DAY_MS,
  formatDateOnly,
  getLastDayOfMonth,
  getTodayDate,
  getUTCDateRange,
  normalizeDateOnly,
} = require("../utils/date");
const {
  findManyPaginated,
  getPagination,
  mapPaginated,
} = require("../utils/pagination");

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const tableBorder = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const getDateRange = (filters) => getUTCDateRange(filters);

const getDisplayStatus = (plan) => {
  if (plan.status === "DONE") return "DONE";
  if (plan.status === "CANCELLED") return "CANCELLED";

  const today = getTodayDate();
  const planDate = normalizeDateOnly(plan.planDate);

  if (plan.status === "PENDING") {
    if (planDate.getTime() === today.getTime()) return "DUE TODAY";
    if (planDate < today) return "OVERDUE";
    return "PENDING";
  }

  return plan.status;
};

const formatDate = (date) => {
  return formatDateOnly(date);
};

const formatExcelDate = (date) => {
  if (!date) return "";

  const value = String(date);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${Number(match[3])}/${Number(match[2])}/${match[1]}`;
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const formatDayMonthExcelDate = (date) => {
  if (!date) return "";

  const value = String(date);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${Number(match[3])}/${Number(match[2])}/${match[1]}`;
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const getMonthTitle = (month) => monthNames[Number(month) - 1] || "All year";

const getPMPlanReportTitle = ({ year, month }) => {
  if (year && month) {
    return `รายงานการ PM ตามแผนประจำเดือน ${getMonthTitle(month)}-${year}`;
  }

  if (year) {
    return `รายงานการ PM ตามแผนประจำปี ${year}`;
  }

  return "รายงานการ PM ตามแผน";
};

const getPMCostReportTitle = ({ year, month }) => {
  if (year && month) {
    return `รายงานค่าใช้จ่ายในการ PM ประจำเดือน ${getMonthTitle(month)}-${year}`;
  }

  if (year) {
    return `รายงานค่าใช้จ่ายในการ PM ประจำปี ${year}`;
  }

  return "รายงานค่าใช้จ่ายในการ PM";
};

const getReportRangeText = ({ year, month, startDate, endDate }) => {
  if (startDate && endDate) {
    return `${formatDayMonthExcelDate(startDate)} ถึง ${formatDayMonthExcelDate(endDate)}`;
  }

  if (year && month) {
    const lastDay = getLastDayOfMonth(year, month);
    return `1/${Number(month)}/${year} ถึง ${lastDay}/${Number(month)}/${year}`;
  }

  if (year) {
    return `1/1/${year} ถึง 31/12/${year}`;
  }

  return "ทั้งหมด";
};

const getDeviceReportName = async (deviceId) => {
  if (!deviceId) {
    return "ทุกอุปกรณ์";
  }

  const device = await prisma.device.findUnique({
    where: {
      id: Number(deviceId),
    },
    select: {
      deviceName: true,
    },
  });

  return device?.deviceName || `Device ID ${deviceId}`;
};

const getGroupReportName = async (groupId) => {
  if (!groupId) {
    return "ทุกกลุ่มอุปกรณ์";
  }

  const group = await prisma.deviceGroup.findUnique({
    where: {
      id: Number(groupId),
    },
    select: {
      name: true,
    },
  });

  return group?.name || `Group ID ${groupId}`;
};

const getZoneReportName = async (zoneId) => {
  if (!zoneId) {
    return "ทุกโซน";
  }

  const zone = await prisma.zone.findUnique({
    where: {
      id: Number(zoneId),
    },
    select: {
      code: true,
      name: true,
    },
  });

  if (!zone) {
    return `Zone ID ${zoneId}`;
  }

  return zone.name ? `${zone.code} - ${zone.name}` : zone.code;
};

const getPMPlanStatusReportName = ({ status, statusView }) => {
  const value = statusView || status;

  const labels = {
    ACTIVE: "Active plans",
    ALL: "ทุกสถานะ",
    PENDING: "PENDING",
    OVERDUE: "OVERDUE",
    DUE_TODAY: "DUE TODAY",
    DONE: "DONE",
    CANCELLED: "CANCELLED",
  };

  return labels[value] || "ทุกสถานะ";
};

const getPMPlanReportSubtitle = async (query) => {
  const [groupName, zoneName] = await Promise.all([
    getGroupReportName(query.groupId),
    getZoneReportName(query.zoneId),
  ]);

  return `ช่วงวันที่ : ${getReportRangeText(query)} | สถานะ : ${getPMPlanStatusReportName(
    query
  )} | กลุ่มอุปกรณ์ : ${groupName} | Zone : ${zoneName}`;
};

exports.getReportDevices = async () =>
  prisma.device.findMany({
    orderBy: {
      deviceName: "asc",
    },
    select: {
      id: true,
      serialNumber: true,
      deviceName: true,
      type: {
        select: {
          name: true,
          group: {
            select: {
              name: true,
            },
          },
        },
      },
      model: {
        select: {
          name: true,
          brand: {
            select: {
              name: true,
            },
          },
        },
      },
      zone: {
        select: {
          code: true,
        },
      },
    },
  });

exports.getPMPlanReport = async (query) => {
  const { year, month, groupId, typeId, zoneId, status, statusView } = query;

  const where = {};
  const andConditions = [];

  const dateRange = getDateRange({ year, month });

  if (dateRange) {
    andConditions.push({
      planDate: dateRange,
    });
  }

  const requestedStatus = statusView || status;

  if (requestedStatus && requestedStatus !== "ALL") {
    if (requestedStatus === "ACTIVE") {
      where.status = {
        not: "CANCELLED",
      };
    } else if (requestedStatus === "OVERDUE") {
      where.status = "PENDING";
      andConditions.push({
        planDate: {
          lt: getTodayDate(),
        },
      });
    } else if (requestedStatus === "DUE_TODAY") {
      const today = getTodayDate();

      where.status = "PENDING";
      andConditions.push({
        planDate: {
          gte: today,
          lt: new Date(today.getTime() + DAY_MS),
        },
      });
    } else if (requestedStatus === "PENDING") {
      const today = getTodayDate();

      where.status = "PENDING";
      andConditions.push({
        planDate: {
          gte: new Date(today.getTime() + DAY_MS),
        },
      });
    } else {
      where.status = requestedStatus;
    }
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

  if (andConditions.length > 0) {
    where.AND = andConditions;
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

  const rowOffset = Array.isArray(plans)
    ? 0
    : (plans.pagination.page - 1) * plans.pagination.pageSize;

  return mapPaginated(plans, (plan, index) => ({
    no: rowOffset + index + 1,
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
  const { deviceId, year, month, startDate, endDate, deviceSearch } = query;

  const where = {};

  if (deviceId) {
    where.deviceId = Number(deviceId);
  } else if (deviceSearch) {
    const searchText = String(deviceSearch).trim();

    if (searchText) {
      where.device = {
        OR: [
          {
            deviceName: {
              contains: searchText,
            },
          },
          {
            serialNumber: {
              contains: searchText,
            },
          },
          {
            type: {
              name: {
                contains: searchText,
              },
            },
          },
          {
            type: {
              group: {
                name: {
                  contains: searchText,
                },
              },
            },
          },
          {
            model: {
              name: {
                contains: searchText,
              },
            },
          },
          {
            model: {
              brand: {
                name: {
                  contains: searchText,
                },
              },
            },
          },
          {
            zone: {
              code: {
                contains: searchText,
              },
            },
          },
        ],
      };
    }
  }

  const dateRange = getDateRange({ year, month, startDate, endDate });

  if (dateRange) {
    where.pmDate = dateRange;
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

  const rowOffset = Array.isArray(records)
    ? 0
    : (records.pagination.page - 1) * records.pagination.pageSize;
  const mappedRecords = mapPaginated(records, (record, index) => ({
    no: rowOffset + index + 1,
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

  if (Array.isArray(mappedRecords)) {
    return mappedRecords;
  }

  const totals = await prisma.pMRecord.aggregate({
    where,
    _count: { _all: true },
    _sum: { cost: true },
  });

  return {
    ...mappedRecords,
    summary: {
      totalRecords: totals._count._all,
      totalCost: Number(totals._sum.cost || 0),
    },
  };
};

exports.getPMCostReport = async (query) => {
  const { year, month, groupId } = query;

  const where = {};

  const dateRange = getDateRange({ year, month });

  if (dateRange) {
    where.pmDate = dateRange;
  }

  if (groupId) {
    where.device = {
      type: {
        groupId: Number(groupId),
      },
    };
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

  const rows = Object.values(summary).map((item, index) => ({
    no: index + 1,
    equipmentGroup: item.equipmentGroup,
    totalPM: item.totalPM,
    totalCost: item.totalCost,
  }));
  const pagination = getPagination(query);

  if (!pagination) return rows;

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages);
  const start = (page - 1) * pagination.pageSize;

  return {
    data: rows.slice(start, start + pagination.pageSize),
    pagination: {
      page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
    },
    summary: getPMCostTotals(rows),
  };
};

const getPMCostTotals = (rows) =>
  rows.reduce(
    (totals, row) => ({
      totalPM: totals.totalPM + Number(row.totalPM || 0),
      totalCost: totals.totalCost + Number(row.totalCost || 0),
    }),
    {
      totalPM: 0,
      totalCost: 0,
    }
  );

const createFormattedReportWorkbook = ({ sheetName, title, subtitle, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headerRowNumber = subtitle ? 3 : 2;

  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width || 18,
  }));

  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = {
    bold: true,
    size: 12,
  };
  titleCell.alignment = {
    horizontal: "center",
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "E2F0D9" },
  };

  if (subtitle) {
    worksheet.mergeCells(2, 1, 2, columns.length);
    const subtitleCell = worksheet.getCell(2, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = {
      bold: true,
    };
    subtitleCell.alignment = {
      horizontal: "center",
    };
    subtitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "E2F0D9" },
    };
  }

  const headerRow = worksheet.getRow(headerRowNumber);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = {
      bold: true,
    };
    cell.alignment = {
      horizontal: "center",
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "DDEBF7" },
    };
    cell.border = tableBorder;
  });

  rows.forEach((row) => {
    const excelRow = worksheet.addRow(
      columns.map((column) => (column.value ? column.value(row) : row[column.key]))
    );

    excelRow.eachCell((cell, columnNumber) => {
      const column = columns[columnNumber - 1];

      cell.border = tableBorder;

      if (column?.alignment) {
        cell.alignment = column.alignment;
      }

      if (column?.numFmt) {
        cell.numFmt = column.numFmt;
      }
    });
  });

  worksheet.views = [
    {
      state: "frozen",
      ySplit: headerRowNumber,
    },
  ];

  return workbook;
};

exports.createPMPlanExcel = async (query) => {
  const rows = await exports.getPMPlanReport(query);
  const subtitle = await getPMPlanReportSubtitle(query);

  const workbook = createFormattedReportWorkbook({
    sheetName: "Plan & Result PM",
    title: getPMPlanReportTitle(query),
    subtitle,
    columns: [
      { header: "No", key: "no", width: 8 },
      {
        header: "PM Plan Date",
        key: "pmPlanDate",
        width: 16,
        value: (row) => formatExcelDate(row.pmPlanDate),
      },
      {
        header: "วันที่ PM อุปกรณ์",
        key: "actualPMDate",
        width: 18,
        value: (row) => formatExcelDate(row.actualPMDate),
      },
      { header: "กลุ่มอุปกรณ์", key: "deviceGroup", width: 18 },
      { header: "ชนิด", key: "deviceType", width: 18 },
      { header: "SN อุปกรณ์", key: "serialNumber", width: 24 },
      { header: "BRAND", key: "brand", width: 16 },
      { header: "MODEL", key: "model", width: 18 },
      { header: "ชื่อของอุปกรณ์", key: "deviceName", width: 24 },
      { header: "Zone", key: "zoneCode", width: 12 },
      { header: "Status", key: "displayStatus", width: 16 },
    ],
    rows,
  });

  return workbook;
};

exports.createPMHistoryExcel = async (query) => {
  const rows = await exports.getPMHistoryReport(query);
  const deviceName =
    query.deviceSearch && !query.deviceId
      ? `คำค้นหา ${query.deviceSearch}`
      : await getDeviceReportName(query.deviceId);

  const workbook = createFormattedReportWorkbook({
    sheetName: "PM Log",
    title: `รายงานประวัติการ PM ของอุปกรณ์ ${deviceName}`,
    subtitle: `ตั้งแต่ : ${getReportRangeText(query)}`,
    columns: [
      { header: "No", key: "no", width: 8 },
      {
        header: "วันที่ PM อุปกรณ์",
        key: "pmDate",
        width: 20,
        value: (row) => formatDayMonthExcelDate(row.pmDate),
      },
      { header: "ผู้ดำเนินการ", key: "performedBy", width: 24 },
    ],
    rows,
  });

  return workbook;
};

exports.createPMCostExcel = async (query) => {
  const rows = await exports.getPMCostReport(query);
  const groupName = await getGroupReportName(query.groupId);
  const totals = getPMCostTotals(rows);
  const rowsWithTotal = [
    ...rows,
    {
      no: "",
      equipmentGroup: "Grand Total",
      totalPM: totals.totalPM,
      totalCost: totals.totalCost,
    },
  ];

  const workbook = createFormattedReportWorkbook({
    sheetName: "PM Cost Report",
    title: getPMCostReportTitle(query),
    subtitle: `ช่วงวันที่ : ${getReportRangeText(query)} | กลุ่มอุปกรณ์ : ${groupName}`,
    columns: [
      {
        header: "No",
        key: "no",
        width: 8,
        alignment: { horizontal: "center" },
      },
      { header: "กลุ่มอุปกรณ์", key: "equipmentGroup", width: 24 },
      {
        header: "จำนวน PM",
        key: "totalPM",
        width: 16,
        alignment: { horizontal: "center" },
        numFmt: "#,##0",
      },
      {
        header: "ค่าใช้จ่ายรวม (บาท)",
        key: "totalCost",
        width: 22,
        alignment: { horizontal: "right" },
        numFmt: "#,##0",
      },
    ],
    rows: rowsWithTotal,
  });

  const worksheet = workbook.getWorksheet("PM Cost Report");
  const totalRow = worksheet.lastRow;

  totalRow.font = {
    bold: true,
  };
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "E2F0D9" },
  };
  totalRow.eachCell((cell) => {
    cell.border = tableBorder;
  });

  return workbook;
};
