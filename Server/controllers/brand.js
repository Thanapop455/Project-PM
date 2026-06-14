const prisma = require("../config/prismaClient");

exports.list = async (req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { id: "desc" },
      include: {
        models: true,
      },
    });

    res.json(brands);
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

    const brand = await prisma.brand.create({
      data: { name },
    });

    res.status(201).json(brand);
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

    const brand = await prisma.brand.update({
      where: { id: Number(id) },
      data: { name },
    });

    res.json(brand);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.brand.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Delete success" });
  } catch (error) {
    next(error);
  }
};