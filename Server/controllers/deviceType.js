const prisma = require("../config/prismaClient");

exports.list = async (req, res, next) => {
  try {
    const types = await prisma.deviceType.findMany({
      orderBy: { id: "desc" },
      include: {
        group: true,
      },
    });

    res.json(types);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { groupId, name } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: "Group is required" });
    }

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const type = await prisma.deviceType.create({
      data: {
        groupId: Number(groupId),
        name,
      },
      include: {
        group: true,
      },
    });

    res.status(201).json(type);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { groupId, name } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: "Group is required" });
    }

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const type = await prisma.deviceType.update({
      where: { id: Number(id) },
      data: {
        groupId: Number(groupId),
        name,
      },
      include: {
        group: true,
      },
    });

    res.json(type);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.deviceType.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Delete success" });
  } catch (error) {
    next(error);
  }
};