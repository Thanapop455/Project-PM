const prisma = require("../config/prisma");
const { findManyPaginated } = require("../utils/pagination");

exports.list = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const groups = await findManyPaginated(prisma.deviceGroup, {
      where: search ? { name: { contains: search } } : undefined,
      orderBy: { id: "desc" },
      include: {
        types: true,
      },
    }, req.query);

    res.json(groups);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const group = await prisma.deviceGroup.create({
      data: { name },
    });

    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const group = await prisma.deviceGroup.update({
      where: { id: Number(id) },
      data: { name },
    });

    res.json(group);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.deviceGroup.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Delete success" });
  } catch (error) {
    next(error);
  }
};
