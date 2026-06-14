const prisma = require("../config/prismaClient");

exports.list = async (req, res, next) => {
  try {
    const zones = await prisma.zone.findMany({
      orderBy: { id: "desc" },
    });

    res.json(zones);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { code, name } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const zone = await prisma.zone.create({
      data: {
        code,
        name: name || null,
      },
    });

    res.status(201).json(zone);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const zone = await prisma.zone.update({
      where: { id: Number(id) },
      data: {
        code,
        name: name || null,
      },
    });

    res.json(zone);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.zone.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Delete success" });
  } catch (error) {
    next(error);
  }
};