const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const deviceTypeSeed = {
  PRINTER: ["LASER", "INKJET", "DOTMATRIX", "THERMAL"],
  COMPUTER: ["PC", "SERVER"],
  NETWORK: ["SWITCH"],
};

const pmPolicySeed = {
  PRINTER: { intervalMonths: 3, defaultCost: 300 },
  NETWORK: { intervalMonths: 3, defaultCost: 400 },
  COMPUTER: { intervalMonths: 6, defaultCost: 500 },
};

const modelSeed = {
  HP: ["M706N", "M602N", "5200", "MFP 477dw", "V1910"],
  OKI: ["395"],
  EPSON: ["LQ300"],
  SEIKO: ["BBP9000E"],
  ZEBRA: ["140xi4", "170xi4"],
  ACER: ["X4620G"],
  IBM: ["X3650M3", "X3650M4"],
  H3C: ["3000"],
  CISCO: ["2960s"],
};

const zoneSeed = ["O1", "P1", "B1"];

const upsertDeviceGroup = (name) =>
  prisma.deviceGroup.upsert({
    where: { name },
    update: {},
    create: { name },
  });

const upsertDeviceType = (groupId, name) =>
  prisma.deviceType.upsert({
    where: {
      groupId_name: {
        groupId,
        name,
      },
    },
    update: {},
    create: {
      groupId,
      name,
    },
  });

const upsertGroupPolicy = async (groupId, policy) => {
  const existing = await prisma.pMPolicy.findFirst({
    where: {
      target: "GROUP",
      deviceGroupId: groupId,
    },
  });

  const data = {
    target: "GROUP",
    deviceGroupId: groupId,
    deviceTypeId: null,
    intervalMonths: policy.intervalMonths,
    defaultCost: String(policy.defaultCost),
    isActive: true,
  };

  if (existing) {
    return prisma.pMPolicy.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.pMPolicy.create({ data });
};

const upsertBrandAndModels = async (brandName, modelNames) => {
  const brand = await prisma.brand.upsert({
    where: { name: brandName },
    update: {},
    create: { name: brandName },
  });

  for (const modelName of modelNames) {
    await prisma.deviceModel.upsert({
      where: {
        brandId_name: {
          brandId: brand.id,
          name: modelName,
        },
      },
      update: {},
      create: {
        brandId: brand.id,
        name: modelName,
      },
    });
  }
};

async function main() {
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const staffPassword = await bcrypt.hash("staff1234", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      fullName: "System Admin",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: {
      username: "staff",
      passwordHash: staffPassword,
      fullName: "Staff A",
      role: "STAFF",
    },
  });

  const groups = {};

  for (const [groupName, typeNames] of Object.entries(deviceTypeSeed)) {
    const group = await upsertDeviceGroup(groupName);
    groups[groupName] = group;

    for (const typeName of typeNames) {
      await upsertDeviceType(group.id, typeName);
    }
  }

  for (const [groupName, policy] of Object.entries(pmPolicySeed)) {
    await upsertGroupPolicy(groups[groupName].id, policy);
  }

  for (const zoneCode of zoneSeed) {
    await prisma.zone.upsert({
      where: { code: zoneCode },
      update: {},
      create: {
        code: zoneCode,
        name: zoneCode,
      },
    });
  }

  for (const [brandName, modelNames] of Object.entries(modelSeed)) {
    await upsertBrandAndModels(brandName, modelNames);
  }

  console.log("Seed PM system master data success");
}

main()
  .catch((error) => {
    console.log(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
