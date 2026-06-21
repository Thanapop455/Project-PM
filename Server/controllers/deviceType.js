const prisma = require("../config/prisma");
const { findManyPaginated } = require("../utils/pagination");

exports.list = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const types = await findManyPaginated(prisma.deviceType, {
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { group: { name: { contains: search } } },
            ],
          }
        : undefined,
      orderBy: { id: "desc" },
      include: {
        group: true,
      },
    }, req.query);

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
