const prisma = require("../config/prisma");
const { findManyPaginated } = require("../utils/pagination");

exports.list = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const models = await findManyPaginated(prisma.deviceModel, {
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { name: { contains: search } } },
            ],
          }
        : undefined,
      orderBy: { id: "desc" },
      include: {
        brand: true,
      },
    }, req.query);

    res.json(models);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { brandId, name } = req.body;

    if (!brandId) {
      return res.status(400).json({ message: "Brand is required" });
    }

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const model = await prisma.deviceModel.create({
      data: {
        brandId: Number(brandId),
        name,
      },
      include: {
        brand: true,
      },
    });

    res.status(201).json(model);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { brandId, name } = req.body;

    if (!brandId) {
      return res.status(400).json({ message: "Brand is required" });
    }

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const model = await prisma.deviceModel.update({
      where: { id: Number(id) },
      data: {
        brandId: Number(brandId),
        name,
      },
      include: {
        brand: true,
      },
    });

    res.json(model);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.deviceModel.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Delete success" });
  } catch (error) {
    next(error);
  }
};
